"""Full-text search across a user's document library."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Chunk, Document, Note
from app.utils.document_filters import filter_documents

MIN_QUERY_LEN = 2
DEFAULT_LIMIT = 30


def _contains(text: str | None, needle: str) -> bool:
    return bool(text and needle in text.lower())


def _snippet(text: str, needle: str, radius: int = 90) -> str:
    cleaned = " ".join(text.split())
    if not cleaned:
        return ""
    lower = cleaned.lower()
    idx = lower.find(needle)
    if idx < 0:
        return cleaned[:180] + ("…" if len(cleaned) > 180 else "")
    start = max(0, idx - radius)
    end = min(len(cleaned), idx + len(needle) + radius)
    out = cleaned[start:end]
    if start > 0:
        out = "…" + out
    if end < len(cleaned):
        out = out + "…"
    return out


def search_documents(
    db: Session,
    user_id: UUID,
    query: str,
    *,
    folder: str | None = None,
    tag: str | None = None,
    limit: int = DEFAULT_LIMIT,
) -> list[dict]:
    needle = query.strip().lower()
    if len(needle) < MIN_QUERY_LEN:
        return []

    documents = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    documents = filter_documents(documents, folder, tag)

    hits: list[dict] = []

    for doc in documents:
        score = 0.0
        snippet = ""
        match_in: list[str] = []

        def consider(text: str | None, weight: float, kind: str) -> None:
            nonlocal score, snippet
            if not _contains(text, needle):
                return
            if weight >= score:
                score = weight
                snippet = _snippet(text or "", needle) or (text or "")[:180]
            if kind not in match_in:
                match_in.append(kind)

        consider(doc.filename, 10.0, "title")
        consider(doc.course_name, 9.0, "course")
        consider(doc.folder, 8.0, "folder")

        for tag_value in doc.tags or []:
            if isinstance(tag_value, str) and _contains(tag_value, needle):
                consider(tag_value, 8.0, "tag")

        note = (
            db.query(Note)
            .filter(Note.document_id == doc.id)
            .order_by(Note.created_at.desc())
            .first()
        )
        if note:
            consider(note.summary, 8.5, "summary")
            for item in note.key_concepts or []:
                if isinstance(item, dict):
                    consider(item.get("concept"), 7.5, "concept")
                    consider(item.get("explanation"), 7.0, "concept")
            for item in note.viva_questions or []:
                if isinstance(item, dict):
                    consider(item.get("question"), 7.0, "viva")
                    consider(item.get("answer"), 6.5, "viva")

        if score < 7.0:
            chunks = (
                db.query(Chunk)
                .filter(Chunk.document_id == doc.id)
                .order_by(Chunk.chunk_index)
                .all()
            )
            for chunk in chunks:
                if _contains(chunk.content, needle):
                    content_score = 6.0
                    if content_score >= score:
                        score = content_score
                        snippet = _snippet(chunk.content or "", needle)
                    if "content" not in match_in:
                        match_in.append("content")
                    break

        if score <= 0:
            continue

        if not snippet:
            snippet = doc.filename

        hits.append(
            {
                "document_id": doc.id,
                "filename": doc.filename,
                "course_name": doc.course_name,
                "folder": doc.folder,
                "tags": doc.tags or [],
                "status": doc.status,
                "source_type": doc.source_type or "pdf",
                "uploaded_at": doc.uploaded_at,
                "score": score,
                "snippet": snippet,
                "match_in": match_in,
            }
        )

    hits.sort(key=lambda h: (-h["score"], h["filename"].lower()))
    return hits[:limit]
