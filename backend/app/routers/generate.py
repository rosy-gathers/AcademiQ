import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Chunk, Document, Note
from app.schemas import GenerateNotesRequest, GenerateNotesResponse, NotesContent
from app.services.quiz_service import safe_parse_json
from app.services.rag_service import generate_with_llm
from app.utils.prompts import NOTES_PROMPT
from app.utils.user_helpers import get_or_create_user

logger = logging.getLogger(__name__)

router = APIRouter()


def _error(message: str, code: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": True, "message": message, "code": code},
    )


def _language_label(language: str) -> str:
    return "Bengali" if language == "bn" else "English"


def _get_document_text(db: Session, document_id: UUID) -> tuple[Document, str]:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise LookupError("Document not found")
    if document.status != "ready":
        raise ValueError("Document is not ready for note generation")

    chunks = (
        db.query(Chunk)
        .filter(Chunk.document_id == document_id)
        .order_by(Chunk.chunk_index)
        .all()
    )
    if not chunks:
        raise ValueError("Document has no indexed content")

    full_text = "\n\n".join(chunk.content for chunk in chunks)
    return document, full_text


async def _generate_notes_json(
    course_name: str,
    full_text: str,
    language: str,
) -> NotesContent:
    language_label = _language_label(language)
    prompt = NOTES_PROMPT.format(
        language=language_label,
        course_name=course_name or "Unknown Course",
        full_text=full_text,
    )

    last_error: ValueError | None = None
    for attempt in range(2):
        try:
            raw = await generate_with_llm(prompt)
            parsed = safe_parse_json(raw)
            if not isinstance(parsed, dict):
                raise ValueError("Notes LLM response must be a JSON object")
            return NotesContent.model_validate(parsed)
        except (ValueError, Exception) as exc:
            last_error = ValueError(str(exc))
            logger.warning("Notes JSON parse attempt %s failed: %s", attempt + 1, exc)

    raise last_error or ValueError("Failed to generate notes")


@router.post("/notes", response_model=GenerateNotesResponse)
async def generate_notes(
    body: GenerateNotesRequest,
    db: Session = Depends(get_db),
):
    try:
        document, full_text = _get_document_text(db, body.document_id)
    except LookupError:
        return _error("Document not found", "NOT_FOUND", status_code=404)
    except ValueError as exc:
        return _error(str(exc), "DOCUMENT_NOT_READY")

    get_or_create_user(db, str(document.user_id), body.user_email or "")

    try:
        notes_content = await _generate_notes_json(
            document.course_name or "",
            full_text,
            body.language,
        )
    except ValueError as exc:
        return _error(str(exc), "GENERATION_FAILED", status_code=500)

    note = Note(
        document_id=document.id,
        summary=notes_content.summary,
        key_concepts=[item.model_dump() for item in notes_content.key_concepts],
        viva_questions=[item.model_dump() for item in notes_content.viva_questions],
        language=body.language,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return GenerateNotesResponse(
        note_id=note.id,
        summary=notes_content.summary,
        key_concepts=notes_content.key_concepts,
        viva_questions=notes_content.viva_questions,
    )


@router.get("/notes/{document_id}")
async def get_notes_for_document(
    document_id: UUID,
    db: Session = Depends(get_db),
):
    note = (
        db.query(Note)
        .filter(Note.document_id == document_id)
        .order_by(Note.created_at.desc())
        .first()
    )
    if not note:
        return _error("Notes not found for this document", "NOT_FOUND", status_code=404)
    return note
