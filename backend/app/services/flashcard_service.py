"""Spaced repetition helpers (simplified SM-2)."""

from datetime import datetime, timedelta

from app.models import Flashcard, Note

# Map UI ratings to SM-2 quality scores (0–5)
RATING_QUALITY = {
    "again": 1,
    "hard": 3,
    "good": 4,
    "easy": 5,
}


def apply_review(card: Flashcard, quality: int) -> None:
    """Update card scheduling after a review."""
    now = datetime.utcnow()
    quality = max(0, min(5, quality))

    if quality < 3:
        card.repetitions = 0
        card.interval_days = 1
    else:
        if card.repetitions == 0:
            card.interval_days = 1
        elif card.repetitions == 1:
            card.interval_days = 6
        else:
            card.interval_days = max(1, int(card.interval_days * card.ease_factor))
        card.repetitions += 1
        card.ease_factor = max(
            1.3,
            card.ease_factor
            + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
        )

    card.next_review_at = now + timedelta(days=card.interval_days)
    card.last_reviewed_at = now
    card.updated_at = now


def cards_from_note(note: Note, document_id, user_id) -> list[dict]:
    """Build flashcard payloads from generated notes."""
    payloads: list[dict] = []
    concepts = note.key_concepts or []
    if isinstance(concepts, list):
        for item in concepts:
            if not isinstance(item, dict):
                continue
            concept = (item.get("concept") or "").strip()
            explanation = (item.get("explanation") or "").strip()
            if concept and explanation:
                payloads.append(
                    {
                        "user_id": user_id,
                        "document_id": document_id,
                        "front": concept,
                        "back": explanation,
                        "source": "notes",
                        "concept_tag": concept,
                    }
                )

    vivas = note.viva_questions or []
    if isinstance(vivas, list):
        for item in vivas:
            if not isinstance(item, dict):
                continue
            question = (item.get("question") or "").strip()
            answer = (item.get("answer") or "").strip()
            if question and answer:
                payloads.append(
                    {
                        "user_id": user_id,
                        "document_id": document_id,
                        "front": question,
                        "back": answer,
                        "source": "notes",
                        "concept_tag": None,
                    }
                )
    return payloads


def cards_from_weak_concepts(
    weak: list[dict],
    user_id,
    document_id=None,
) -> list[dict]:
    payloads: list[dict] = []
    for item in weak:
        concept = (item.get("concept") or "").strip()
        if not concept:
            continue
        count = item.get("wrong_count", 0)
        payloads.append(
            {
                "user_id": user_id,
                "document_id": document_id,
                "front": concept,
                "back": (
                    f"You missed questions tagged with “{concept}” {count} time(s). "
                    "Re-read your notes and lecture material, then quiz yourself again."
                ),
                "source": "weak_concept",
                "concept_tag": concept,
            }
        )
    return payloads
