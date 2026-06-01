import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Chunk, Document, Quiz, QuizAttempt
from app.schemas import (
    QuizAttemptListResponse,
    QuizAttemptRequest,
    QuizAttemptResponse,
    QuizAttemptSummary,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestion,
    QuizResponse,
    SourceCitation,
    WeakConceptsResponse,
)
from app.services.embedding_service import retrieve_chunk_citations, retrieve_relevant_chunks
from app.services.quiz_service import (
    aggregate_weak_concepts,
    grade_quiz_attempt,
    parse_quiz_questions,
)
from app.services.rag_service import generate_with_llm
from app.utils.prompts import QUIZ_PROMPT
from app.utils.user_helpers import get_or_create_user

logger = logging.getLogger(__name__)

router = APIRouter()
analytics_router = APIRouter()


def _error(message: str, code: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": True, "message": message, "code": code},
    )


def _excerpt(text: str, max_len: int = 320) -> str:
    text = " ".join(text.split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def _get_chunk_context(db: Session, document_id: UUID) -> tuple[str, list[dict]]:
    chunks = (
        db.query(Chunk)
        .filter(Chunk.document_id == document_id)
        .order_by(Chunk.chunk_index)
        .all()
    )
    if chunks:
        citations = [
            {
                "index": i + 1,
                "chunk_index": c.chunk_index if c.chunk_index is not None else i,
                "excerpt": _excerpt(c.content),
            }
            for i, c in enumerate(chunks[:12])
        ]
        return "\n\n---\n\n".join(chunk.content for chunk in chunks), citations

    citations = retrieve_chunk_citations(
        "important concepts definitions and examples",
        str(document_id),
        k=12,
    )
    for c in citations:
        c.pop("content", None)
    text = retrieve_relevant_chunks(
        "important concepts definitions and examples",
        str(document_id),
        k=15,
    )
    return "\n\n---\n\n".join(text), citations


def _sources_for_question(
    document_id: UUID,
    question: dict,
    k: int = 3,
) -> list[SourceCitation]:
    query = f"{question.get('question', '')} {question.get('concept_tag', '')}"
    raw = retrieve_chunk_citations(query, str(document_id), k=k)
    for c in raw:
        c.pop("content", None)
    return [SourceCitation.model_validate(c) for c in raw]


async def _generate_quiz_questions(
    chunks_text: str,
    difficulty: str,
    num_questions: int,
) -> list[dict]:
    prompt = QUIZ_PROMPT.format(
        difficulty=difficulty,
        chunks=chunks_text,
        num_questions=num_questions,
    )

    last_error: ValueError | None = None
    for attempt in range(2):
        try:
            raw = await generate_with_llm(prompt)
            return parse_quiz_questions(raw)
        except (ValueError, Exception) as exc:
            last_error = ValueError(str(exc))
            logger.warning("Quiz JSON parse attempt %s failed: %s", attempt + 1, exc)

    raise last_error or ValueError("Failed to generate quiz")


@router.post("/generate", response_model=QuizGenerateResponse)
async def generate_quiz(
    body: QuizGenerateRequest,
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == body.document_id).first()
    if not document:
        return _error("Document not found", "NOT_FOUND", status_code=404)
    if document.status != "ready":
        return _error("Document is not ready for quiz generation", "DOCUMENT_NOT_READY")

    chunks_text, source_citations = _get_chunk_context(db, body.document_id)
    if not chunks_text.strip():
        return _error("Document has no indexed content", "NO_CONTENT")

    try:
        questions_raw = await _generate_quiz_questions(
            chunks_text,
            body.difficulty,
            body.num_questions,
        )
    except ValueError as exc:
        return _error(str(exc), "GENERATION_FAILED", status_code=500)

    quiz = Quiz(
        document_id=document.id,
        questions=questions_raw,
        difficulty=body.difficulty,
        source_citations=source_citations,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    if body.exam_mode:
        for q in questions_raw:
            if isinstance(q, dict):
                q.pop("explanation", None)

    questions = [QuizQuestion.model_validate(q) for q in questions_raw]
    citations = [SourceCitation.model_validate(c) for c in source_citations]
    return QuizGenerateResponse(
        quiz_id=quiz.id,
        questions=questions,
        source_citations=citations,
    )


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: UUID,
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        return _error("Quiz not found", "NOT_FOUND", status_code=404)
    return quiz


@router.post("/attempt", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    body: QuizAttemptRequest,
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == body.quiz_id).first()
    if not quiz:
        return _error("Quiz not found", "NOT_FOUND", status_code=404)

    questions = quiz.questions or []
    if not questions:
        return _error("Quiz has no questions", "EMPTY_QUIZ")

    get_or_create_user(db, str(body.user_id), body.user_email or "")

    score, total, percentage, wrong_concepts, results = grade_quiz_attempt(
        questions,
        body.answers,
    )

    document = db.query(Document).filter(Document.id == quiz.document_id).first()
    enriched_results = []
    for item in results:
        q = questions[item.question_index]
        sources = (
            _sources_for_question(quiz.document_id, q)
            if document
            else []
        )
        enriched_results.append(item.model_copy(update={"sources": sources}))

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=body.user_id,
        score=score,
        answers=body.answers,
        wrong_concepts=wrong_concepts,
        mode=body.mode,
        time_limit_seconds=body.time_limit_seconds,
        elapsed_seconds=body.elapsed_seconds,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return QuizAttemptResponse(
        score=score,
        total=total,
        percentage=percentage,
        wrong_concepts=wrong_concepts,
        results=enriched_results,
        mode=body.mode,
        time_limit_seconds=body.time_limit_seconds,
        elapsed_seconds=body.elapsed_seconds,
        attempt_id=attempt.id,
    )


@router.get("/attempts/user/{user_id}", response_model=QuizAttemptListResponse)
async def list_user_attempts(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.taken_at.desc())
        .limit(5)
        .all()
    )

    summaries: list[QuizAttemptSummary] = []
    for attempt in attempts:
        quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
        total = len(quiz.questions) if quiz and quiz.questions else 0
        percentage = round((attempt.score / total) * 100, 2) if total > 0 else 0.0
        summaries.append(
            QuizAttemptSummary(
                quiz_id=attempt.quiz_id,
                score=attempt.score or 0,
                total=total,
                percentage=percentage,
                taken_at=attempt.taken_at,
            )
        )

    return QuizAttemptListResponse(attempts=summaries)


@analytics_router.get("/weak-concepts/{user_id}", response_model=WeakConceptsResponse)
async def get_weak_concepts(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).all()
    weak = aggregate_weak_concepts([attempt.wrong_concepts for attempt in attempts])
    return WeakConceptsResponse(weak_concepts=weak)
