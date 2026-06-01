"""Build a portable JSON export of all user learning data."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import (
    Chunk,
    Document,
    Flashcard,
    Note,
    Quiz,
    QuizAttempt,
    Session as ChatSession,
    StudyPlanItem,
    User,
)


def _dt(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _uuid(value: UUID | None) -> str | None:
    return str(value) if value else None


def build_user_export(
    db: Session,
    user_id: UUID,
    *,
    include_chunks: bool = False,
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    documents = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    doc_ids = [d.id for d in documents]

    notes: list[Note] = []
    if doc_ids:
        notes = (
            db.query(Note)
            .filter(Note.document_id.in_(doc_ids))
            .order_by(Note.created_at.desc())
            .all()
        )

    quizzes: list[Quiz] = []
    if doc_ids:
        quizzes = db.query(Quiz).filter(Quiz.document_id.in_(doc_ids)).all()

    quiz_ids = [q.id for q in quizzes]
    attempts: list[QuizAttempt] = []
    if quiz_ids:
        attempts = (
            db.query(QuizAttempt)
            .filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.quiz_id.in_(quiz_ids),
            )
            .order_by(QuizAttempt.taken_at.desc())
            .all()
        )

    flashcards = (
        db.query(Flashcard)
        .filter(Flashcard.user_id == user_id)
        .order_by(Flashcard.created_at.desc())
        .all()
    )
    study_items = (
        db.query(StudyPlanItem)
        .filter(StudyPlanItem.user_id == user_id)
        .order_by(StudyPlanItem.due_at.asc())
        .all()
    )
    chat_sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    chunks_by_doc: dict[UUID, list[Chunk]] = {}
    if include_chunks and doc_ids:
        all_chunks = (
            db.query(Chunk)
            .filter(Chunk.document_id.in_(doc_ids))
            .order_by(Chunk.chunk_index)
            .all()
        )
        for chunk in all_chunks:
            chunks_by_doc.setdefault(chunk.document_id, []).append(chunk)

    quiz_doc = {q.id: q.document_id for q in quizzes}

    return {
        "export_version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "user": {
            "id": _uuid(user_id),
            "email": user.email if user else None,
            "name": user.name if user else None,
            "language_pref": user.language_pref if user else None,
            "created_at": _dt(user.created_at) if user else None,
        },
        "documents": [
            {
                "id": _uuid(d.id),
                "filename": d.filename,
                "course_name": d.course_name,
                "folder": d.folder,
                "tags": d.tags or [],
                "status": d.status,
                "source_type": d.source_type,
                "language_override": d.language_override,
                "duration_seconds": d.duration_seconds,
                "total_chunks": d.total_chunks,
                "uploaded_at": _dt(d.uploaded_at),
                "chunks": [
                    {
                        "id": _uuid(c.id),
                        "chunk_index": c.chunk_index,
                        "content": c.content,
                    }
                    for c in chunks_by_doc.get(d.id, [])
                ]
                if include_chunks
                else [],
            }
            for d in documents
        ],
        "notes": [
            {
                "id": _uuid(n.id),
                "document_id": _uuid(n.document_id),
                "summary": n.summary,
                "key_concepts": n.key_concepts,
                "viva_questions": n.viva_questions,
                "language": n.language,
                "created_at": _dt(n.created_at),
            }
            for n in notes
        ],
        "quizzes": [
            {
                "id": _uuid(q.id),
                "document_id": _uuid(q.document_id),
                "difficulty": q.difficulty,
                "questions": q.questions,
                "source_citations": q.source_citations,
                "created_at": _dt(q.created_at),
            }
            for q in quizzes
        ],
        "quiz_attempts": [
            {
                "id": _uuid(a.id),
                "quiz_id": _uuid(a.quiz_id),
                "document_id": _uuid(quiz_doc.get(a.quiz_id)),
                "score": a.score,
                "answers": a.answers,
                "wrong_concepts": a.wrong_concepts,
                "mode": a.mode,
                "time_limit_seconds": a.time_limit_seconds,
                "elapsed_seconds": a.elapsed_seconds,
                "taken_at": _dt(a.taken_at),
            }
            for a in attempts
        ],
        "flashcards": [
            {
                "id": _uuid(f.id),
                "document_id": _uuid(f.document_id),
                "front": f.front,
                "back": f.back,
                "source": f.source,
                "concept_tag": f.concept_tag,
                "ease_factor": f.ease_factor,
                "interval_days": f.interval_days,
                "repetitions": f.repetitions,
                "next_review_at": _dt(f.next_review_at),
                "last_reviewed_at": _dt(f.last_reviewed_at),
                "created_at": _dt(f.created_at),
            }
            for f in flashcards
        ],
        "study_plan_items": [
            {
                "id": _uuid(s.id),
                "document_id": _uuid(s.document_id),
                "title": s.title,
                "due_at": _dt(s.due_at),
                "remind_days_before": s.remind_days_before,
                "completed": bool(s.completed),
                "created_at": _dt(s.created_at),
                "updated_at": _dt(s.updated_at),
            }
            for s in study_items
        ],
        "chat_sessions": [
            {
                "id": _uuid(s.id),
                "document_id": _uuid(s.document_id),
                "messages": s.messages or [],
                "updated_at": _dt(s.updated_at),
            }
            for s in chat_sessions
        ],
        "counts": {
            "documents": len(documents),
            "notes": len(notes),
            "quizzes": len(quizzes),
            "quiz_attempts": len(attempts),
            "flashcards": len(flashcards),
            "study_plan_items": len(study_items),
            "chat_sessions": len(chat_sessions),
        },
    }
