from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, Flashcard, Note, QuizAttempt
from app.schemas import (
    FlashcardCreate,
    FlashcardGenerateFromNotesRequest,
    FlashcardGenerateResponse,
    FlashcardGenerateWeakRequest,
    FlashcardListResponse,
    FlashcardResponse,
    FlashcardReviewRequest,
)
from app.services.flashcard_service import (
    RATING_QUALITY,
    apply_review,
    cards_from_note,
    cards_from_weak_concepts,
)
from app.services.quiz_service import aggregate_weak_concepts

router = APIRouter()


def _error(message: str, code: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": True, "message": message, "code": code},
    )


def _to_response(card: Flashcard, document_filename: str | None = None) -> FlashcardResponse:
    return FlashcardResponse(
        id=card.id,
        user_id=card.user_id,
        document_id=card.document_id,
        document_filename=document_filename,
        front=card.front,
        back=card.back,
        source=card.source,
        concept_tag=card.concept_tag,
        ease_factor=float(card.ease_factor or 2.5),
        interval_days=card.interval_days or 0,
        repetitions=card.repetitions or 0,
        next_review_at=card.next_review_at,
        last_reviewed_at=card.last_reviewed_at,
        created_at=card.created_at,
    )


def _serialize_cards(db: Session, cards: list[Flashcard]) -> list[FlashcardResponse]:
    doc_ids = {c.document_id for c in cards if c.document_id}
    filenames: dict[UUID, str] = {}
    if doc_ids:
        docs = db.query(Document).filter(Document.id.in_(doc_ids)).all()
        filenames = {d.id: d.filename for d in docs}
    return [
        _to_response(c, filenames.get(c.document_id) if c.document_id else None)
        for c in cards
    ]


def _existing_fronts(db: Session, user_id: UUID) -> set[str]:
    rows = db.query(Flashcard.front).filter(Flashcard.user_id == user_id).all()
    return {r[0].strip().lower() for r in rows if r[0]}


def _bulk_create(
    db: Session,
    payloads: list[dict],
    existing: set[str],
) -> tuple[int, int, list[Flashcard]]:
    created_cards: list[Flashcard] = []
    created = 0
    skipped = 0
    now = datetime.utcnow()

    for payload in payloads:
        front_key = payload["front"].strip().lower()
        if front_key in existing:
            skipped += 1
            continue
        card = Flashcard(
            user_id=payload["user_id"],
            document_id=payload.get("document_id"),
            front=payload["front"].strip(),
            back=payload["back"].strip(),
            source=payload.get("source", "manual"),
            concept_tag=payload.get("concept_tag"),
            ease_factor=2.5,
            interval_days=0,
            repetitions=0,
            next_review_at=now,
        )
        db.add(card)
        created_cards.append(card)
        existing.add(front_key)
        created += 1

    if created:
        db.commit()
        for card in created_cards:
            db.refresh(card)
    return created, skipped, created_cards


@router.get("/user/{user_id}", response_model=FlashcardListResponse)
def list_flashcards(
    user_id: UUID,
    due_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    q = db.query(Flashcard).filter(Flashcard.user_id == user_id)
    if due_only:
        q = q.filter(Flashcard.next_review_at <= now)
    cards = q.order_by(Flashcard.next_review_at.asc()).all()
    due_count = (
        db.query(Flashcard)
        .filter(Flashcard.user_id == user_id, Flashcard.next_review_at <= now)
        .count()
    )
    return FlashcardListResponse(
        cards=_serialize_cards(db, cards),
        due_count=due_count,
    )


@router.post("", response_model=FlashcardResponse, status_code=201)
def create_flashcard(body: FlashcardCreate, db: Session = Depends(get_db)):
    if body.document_id:
        doc = (
            db.query(Document)
            .filter(Document.id == body.document_id, Document.user_id == body.user_id)
            .first()
        )
        if not doc:
            return _error("Document not found", "DOCUMENT_NOT_FOUND", 404)

    now = datetime.utcnow()
    card = Flashcard(
        user_id=body.user_id,
        document_id=body.document_id,
        front=body.front.strip(),
        back=body.back.strip(),
        source="manual",
        next_review_at=now,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    filename = None
    if card.document_id:
        doc = db.query(Document).filter(Document.id == card.document_id).first()
        filename = doc.filename if doc else None
    return _to_response(card, filename)


@router.post("/generate-from-notes", response_model=FlashcardGenerateResponse)
def generate_from_notes(
    body: FlashcardGenerateFromNotesRequest,
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == body.document_id, Document.user_id == body.user_id)
        .first()
    )
    if not doc:
        return _error("Document not found", "DOCUMENT_NOT_FOUND", 404)

    note = (
        db.query(Note)
        .filter(Note.document_id == body.document_id)
        .order_by(Note.created_at.desc())
        .first()
    )
    if not note:
        return _error(
            "Generate notes for this lecture first",
            "NOTES_NOT_FOUND",
            404,
        )

    payloads = cards_from_note(note, body.document_id, body.user_id)
    if not payloads:
        return _error("No flashcard content in notes", "EMPTY_NOTES", 400)

    existing = _existing_fronts(db, body.user_id)
    created, skipped, cards = _bulk_create(db, payloads, existing)
    return FlashcardGenerateResponse(
        created=created,
        skipped=skipped,
        cards=_serialize_cards(db, cards),
    )


@router.post("/generate-from-weak-concepts", response_model=FlashcardGenerateResponse)
def generate_from_weak_concepts(
    body: FlashcardGenerateWeakRequest,
    db: Session = Depends(get_db),
):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == body.user_id).all()
    weak = aggregate_weak_concepts([a.wrong_concepts for a in attempts])
    if not weak:
        return _error(
            "No weak concepts yet — complete a quiz first",
            "NO_WEAK_CONCEPTS",
            404,
        )

    payloads = cards_from_weak_concepts(
        [{"concept": w.concept, "wrong_count": w.wrong_count} for w in weak],
        body.user_id,
    )
    existing = _existing_fronts(db, body.user_id)
    created, skipped, cards = _bulk_create(db, payloads, existing)
    return FlashcardGenerateResponse(
        created=created,
        skipped=skipped,
        cards=_serialize_cards(db, cards),
    )


@router.post("/{card_id}/review", response_model=FlashcardResponse)
def review_flashcard(
    card_id: UUID,
    body: FlashcardReviewRequest,
    db: Session = Depends(get_db),
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        return _error("Flashcard not found", "NOT_FOUND", 404)

    quality = RATING_QUALITY.get(body.rating, 3)
    apply_review(card, quality)
    db.commit()
    db.refresh(card)

    filename = None
    if card.document_id:
        doc = db.query(Document).filter(Document.id == card.document_id).first()
        filename = doc.filename if doc else None
    return _to_response(card, filename)


@router.delete("/{card_id}", status_code=204)
def delete_flashcard(card_id: UUID, db: Session = Depends(get_db)):
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        return _error("Flashcard not found", "NOT_FOUND", 404)
    db.delete(card)
    db.commit()
    return Response(status_code=204)
