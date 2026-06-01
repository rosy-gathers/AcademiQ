import json
import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import SessionLocal
from app.models import Document, Session
from app.schemas import ChatMessageIn
from app.services.embedding_service import retrieve_chunk_citations
from app.services.rag_service import stream_chat_response
from app.utils.language import language_label, resolve_language
from app.utils.user_helpers import get_or_create_user

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_or_create_session(
    db,
    user_id: UUID,
    document_id: UUID,
    session_id: UUID | None,
) -> Session:
    if session_id:
        session = (
            db.query(Session)
            .filter(
                Session.id == session_id,
                Session.user_id == user_id,
                Session.document_id == document_id,
            )
            .first()
        )
        if session:
            return session

    session = Session(user_id=user_id, document_id=document_id, messages=[])
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.websocket("/{document_id}")
async def chat_websocket(websocket: WebSocket, document_id: UUID):
    await websocket.accept()
    db = SessionLocal()

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = ChatMessageIn.model_validate(json.loads(raw))
            except (json.JSONDecodeError, ValueError) as exc:
                await websocket.send_json(
                    {
                        "error": True,
                        "message": f"Invalid message format: {exc}",
                        "code": "INVALID_PAYLOAD",
                    }
                )
                continue

            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                await websocket.send_json(
                    {
                        "error": True,
                        "message": "Document not found",
                        "code": "NOT_FOUND",
                    }
                )
                continue

            get_or_create_user(db, str(payload.user_id), payload.user_email or "")

            lang_code, auto_detected = resolve_language(
                payload.message,
                document.language_override,
            )
            await websocket.send_json(
                {
                    "type": "language",
                    "value": language_label(lang_code),
                    "code": lang_code,
                    "auto_detected": auto_detected,
                    "override": document.language_override or "auto",
                }
            )

            citations = retrieve_chunk_citations(
                payload.message,
                str(document_id),
                k=5,
            )
            chunks = [c["content"] for c in citations]

            session = _get_or_create_session(
                db,
                payload.user_id,
                document_id,
                payload.session_id,
            )
            history: list[dict] = list(session.messages or [])

            try:
                full_response = await stream_chat_response(
                    question=payload.message,
                    chunks=chunks,
                    course_name=document.course_name or "Unknown Course",
                    language=language_label(lang_code),
                    last_messages=history,
                    websocket=websocket,
                    session_id=session.id,
                    source_citations=citations,
                )
            except Exception as exc:
                logger.exception("Chat streaming failed")
                await websocket.send_json(
                    {
                        "error": True,
                        "message": str(exc),
                        "code": "STREAM_FAILED",
                    }
                )
                continue

            timestamp = datetime.utcnow().isoformat()
            history.append(
                {
                    "role": "user",
                    "content": payload.message,
                    "timestamp": timestamp,
                }
            )
            history.append(
                {
                    "role": "assistant",
                    "content": full_response,
                    "timestamp": timestamp,
                    "sources": citations,
                }
            )
            session.messages = history
            session.updated_at = datetime.utcnow()
            db.commit()

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for document %s", document_id)
    finally:
        db.close()
