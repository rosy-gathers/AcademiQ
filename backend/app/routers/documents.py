import asyncio
import logging
import uuid
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from supabase import create_client

from app.config import settings
from app.database import get_db
from app.models import Chunk, Document
from app.schemas import (
    AudioTranscribeResponse,
    DocumentLabelsResponse,
    DocumentLanguageUpdate,
    DocumentListResponse,
    DocumentOrganizationUpdate,
    DocumentResponse,
    DocumentSearchResponse,
    DocumentUploadResponse,
    TranscriptChapter,
    TranscriptResponse,
    TranscriptSegment,
)
from app.utils.document_filters import filter_documents
from app.utils.document_labels import normalize_folder, normalize_tags, parse_tags_form
from app.utils.language import VALID_LANGUAGE_OVERRIDES
from app.utils.user_helpers import get_or_create_user
from app.services.document_search_service import search_documents
from app.services.audio_service import (
    audio_suffix_from_filename,
    transcribe_audio_bytes_detailed,
    transcript_preview,
)
from app.services.embedding_service import chunk_text, embed_and_store
from app.services.pdf_service import extract_text_from_pdf

logger = logging.getLogger(__name__)

router = APIRouter()
audio_router = APIRouter()

STORAGE_BUCKET = "documents"


def _error(message: str, code: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": True, "message": message, "code": code},
    )


def _upload_to_supabase(
    file_bytes: bytes,
    filename: str,
    user_id: UUID,
    content_type: str,
) -> str | None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    storage_path = f"{user_id}/{uuid.uuid4()}_{filename}"
    client.storage.from_(STORAGE_BUCKET).upload(
        storage_path,
        file_bytes,
        file_options={"content-type": content_type},
    )
    return storage_path


async def _index_document_text(
    db: Session,
    document: Document,
    text: str,
) -> int:
    """Chunk, embed, persist Chunk rows, and mark document ready."""
    chunks = await asyncio.to_thread(chunk_text, text)
    if not chunks:
        document.status = "failed"
        db.commit()
        return 0

    chroma_ids = await asyncio.to_thread(
        embed_and_store,
        chunks,
        str(document.id),
        str(document.user_id),
    )

    for index, (content, chroma_id) in enumerate(zip(chunks, chroma_ids)):
        db.add(
            Chunk(
                document_id=document.id,
                content=content,
                chroma_vector_id=chroma_id,
                chunk_index=index,
            )
        )

    document.status = "ready"
    document.total_chunks = len(chunks)
    db.commit()
    db.refresh(document)
    return len(chunks)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    course_name: str = Form(...),
    user_id: UUID = Form(...),
    user_email: str = Form(""),
    language_override: str = Form("auto"),
    folder: str = Form(""),
    tags: str = Form(""),
    db: Session = Depends(get_db),
):
    get_or_create_user(db, str(user_id), user_email)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return _error("Only PDF files are supported", "INVALID_FILE_TYPE")

    file_bytes = await file.read()
    lang = language_override if language_override in VALID_LANGUAGE_OVERRIDES else "auto"
    document = Document(
        user_id=user_id,
        filename=file.filename,
        course_name=course_name,
        folder=normalize_folder(folder),
        tags=parse_tags_form(tags),
        source_type="pdf",
        language_override=lang,
        status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        s3_key = await asyncio.to_thread(
            _upload_to_supabase,
            file_bytes,
            file.filename,
            user_id,
            file.content_type or "application/pdf",
        )
        if s3_key:
            document.s3_key = s3_key
            db.commit()

        full_text = await asyncio.to_thread(extract_text_from_pdf, file_bytes)
        if not full_text.strip():
            document.status = "failed"
            db.commit()
            return _error("No extractable text found in PDF", "EMPTY_PDF")

        total_chunks = await _index_document_text(db, document, full_text)
        return DocumentUploadResponse(
            document_id=document.id,
            status=document.status,
            total_chunks=total_chunks,
        )
    except Exception as exc:
        logger.exception("Document upload failed for %s", document.id)
        document.status = "failed"
        db.commit()
        message = str(exc)
        if "Invalid API key" in message and "supabase" in message.lower():
            message = "Supabase service key is invalid — check SUPABASE_SERVICE_KEY in backend/.env"
        elif "API key" in message and "GOOGLE" in message.upper():
            message = "Google API key is invalid — check GOOGLE_API_KEY in backend/.env"
        elif "Invalid API key" in message:
            message = (
                "Invalid API key during upload. Verify GOOGLE_API_KEY and "
                "SUPABASE_SERVICE_KEY in backend/.env"
            )
        return _error(message, "UPLOAD_FAILED", status_code=500)


@audio_router.post("/transcribe", response_model=AudioTranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    course_name: str = Form(...),
    user_id: UUID = Form(...),
    user_email: str = Form(""),
    language_override: str = Form("auto"),
    folder: str = Form(""),
    tags: str = Form(""),
    db: Session = Depends(get_db),
):
    if not file.filename:
        return _error("Audio file is required", "INVALID_FILE_TYPE")

    get_or_create_user(db, str(user_id), user_email)

    suffix = audio_suffix_from_filename(file.filename)
    file_bytes = await file.read()

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    original_name = file.filename or "recording"
    display_name = f"Lecture audio — {original_name}"

    lang = language_override if language_override in VALID_LANGUAGE_OVERRIDES else "auto"
    document = Document(
        user_id=user_id,
        filename=display_name,
        course_name=course_name,
        folder=normalize_folder(folder),
        tags=parse_tags_form(tags),
        source_type="audio",
        language_override=lang,
        status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        payload = await asyncio.to_thread(
            transcribe_audio_bytes_detailed,
            file_bytes,
            suffix,
        )
        transcript = payload.get("text", "").strip()
        if not transcript:
            document.status = "failed"
            db.commit()
            return _error("Transcription produced no text", "EMPTY_TRANSCRIPT")

        document.transcript_data = {
            "segments": payload.get("segments", []),
            "chapters": payload.get("chapters", []),
            "speakers": payload.get("speakers", []),
        }
        document.duration_seconds = int(payload.get("duration_seconds", 0))

        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                s3_key = await asyncio.to_thread(
                    _upload_to_supabase,
                    file_bytes,
                    original_name,
                    user_id,
                    file.content_type or "audio/mpeg",
                )
                if s3_key:
                    document.s3_key = s3_key
            except Exception:
                logger.warning("Audio storage upload skipped for %s", document.id)

        total_chunks = await _index_document_text(db, document, transcript)
        return AudioTranscribeResponse(
            document_id=document.id,
            transcript_preview=transcript_preview(transcript),
            duration_seconds=float(payload.get("duration_seconds", 0)),
            chapter_count=len(payload.get("chapters", [])),
            segment_count=len(payload.get("segments", [])),
            speakers=list(payload.get("speakers", [])),
        )
    except Exception as exc:
        logger.exception("Audio transcribe failed for %s", document.id)
        document.status = "failed"
        db.commit()
        err_msg = str(exc)
        if "whisper" in err_msg.lower():
            return _error(
                "Audio transcription requires openai-whisper. "
                "Install with: pip install openai-whisper",
                "WHISPER_NOT_INSTALLED",
                status_code=503,
            )
        return _error(err_msg, "TRANSCRIBE_FAILED", status_code=500)


@audio_router.get("/transcript/{document_id}", response_model=TranscriptResponse)
async def get_audio_transcript(
    document_id: UUID,
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return _error("Document not found", "NOT_FOUND", 404)
    if document.source_type != "audio" or not document.transcript_data:
        return _error("No audio transcript for this document", "NOT_AUDIO", 404)

    data = document.transcript_data
    segments = [TranscriptSegment.model_validate(s) for s in data.get("segments", [])]
    chapters = [TranscriptChapter.model_validate(c) for c in data.get("chapters", [])]
    speakers = list(data.get("speakers", []))

    full_text = ""
    chunks = (
        db.query(Chunk)
        .filter(Chunk.document_id == document_id)
        .order_by(Chunk.chunk_index)
        .all()
    )
    if chunks:
        full_text = "\n\n".join(c.content for c in chunks)
    else:
        full_text = "\n".join(s.text for s in segments)

    return TranscriptResponse(
        document_id=document.id,
        duration_seconds=float(document.duration_seconds or 0),
        speakers=speakers,
        chapters=chapters,
        segments=segments,
        full_text=full_text,
    )


@router.get("/user/{user_id}/labels", response_model=DocumentLabelsResponse)
async def list_document_labels(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    documents = db.query(Document).filter(Document.user_id == user_id).all()
    folders: set[str] = set()
    tags: set[str] = set()
    for doc in documents:
        if doc.folder:
            folders.add(doc.folder.strip())
        for tag in doc.tags or []:
            if isinstance(tag, str) and tag.strip():
                tags.add(tag.strip())
    return DocumentLabelsResponse(
        folders=sorted(folders, key=str.lower),
        tags=sorted(tags, key=str.lower),
    )


@router.get("/user/{user_id}", response_model=DocumentListResponse)
async def list_user_documents(
    user_id: UUID,
    folder: str | None = Query(None),
    tag: str | None = Query(None),
    db: Session = Depends(get_db),
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    documents = filter_documents(documents, folder, tag)
    return DocumentListResponse(documents=documents)


@router.get("/user/{user_id}/search", response_model=DocumentSearchResponse)
async def search_user_documents(
    user_id: UUID,
    q: str = Query(..., min_length=1),
    folder: str | None = Query(None),
    tag: str | None = Query(None),
    limit: int = Query(30, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = q.strip()
    if len(query) < 2:
        return DocumentSearchResponse(query=query, results=[], total=0)

    hits = search_documents(
        db,
        user_id,
        query,
        folder=folder,
        tag=tag,
        limit=limit,
    )
    return DocumentSearchResponse(query=query, results=hits, total=len(hits))


@router.delete("/{document_id}", status_code=200)
async def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return _error("Document not found", "NOT_FOUND", status_code=404)

    # Remove from Supabase Storage (best-effort, don't block on failure)
    if document.s3_key and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            client.storage.from_(STORAGE_BUCKET).remove([document.s3_key])
        except Exception:
            logger.warning("Could not delete storage file for document %s", document_id)

    # Delete chunks first (cascade may not be set on all DBs)
    db.query(Chunk).filter(Chunk.document_id == document_id).delete()
    db.delete(document)
    db.commit()
    return {"deleted": True, "document_id": str(document_id)}


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return _error("Document not found", "NOT_FOUND", status_code=404)
    return document


@router.patch("/{document_id}/language", response_model=DocumentResponse)
async def update_document_language(
    document_id: UUID,
    body: DocumentLanguageUpdate,
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return _error("Document not found", "NOT_FOUND", status_code=404)
    document.language_override = body.language_override
    db.commit()
    db.refresh(document)
    return document


@router.patch("/{document_id}/organization", response_model=DocumentResponse)
async def update_document_organization(
    document_id: UUID,
    body: DocumentOrganizationUpdate,
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return _error("Document not found", "NOT_FOUND", status_code=404)
    document.folder = normalize_folder(body.folder)
    document.tags = normalize_tags(body.tags)
    db.commit()
    db.refresh(document)
    return document
