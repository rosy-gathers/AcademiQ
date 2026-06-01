import json
import logging
import re
from typing import Any

from app.schemas import QuestionResult, WeakConceptItem

logger = logging.getLogger(__name__)


def safe_parse_json(text: str) -> dict | list:
    """Parse LLM JSON output, stripping markdown fences if present."""
    try:
        clean = re.sub(r"```json|```", "", text).strip()
        return json.loads(clean)
    except json.JSONDecodeError as exc:
        raise ValueError(f"LLM returned invalid JSON: {text[:200]}") from exc


def normalize_quiz_questions(raw_questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ensure every question has a concept_tag for weak-concept analytics."""
    normalized: list[dict[str, Any]] = []
    for question in raw_questions:
        q = dict(question)
        if not q.get("concept_tag"):
            logger.warning("Quiz question missing concept_tag, defaulting to General")
            q["concept_tag"] = "General"
        normalized.append(q)
    return normalized


def parse_quiz_questions(llm_response: str) -> list[dict[str, Any]]:
    """Parse and normalize MCQ JSON array from the LLM."""
    parsed = safe_parse_json(llm_response)
    if not isinstance(parsed, list):
        raise ValueError("Quiz LLM response must be a JSON array")
    return normalize_quiz_questions(parsed)


def grade_quiz_attempt(
    questions: list[dict[str, Any]],
    answers: dict[str, str],
) -> tuple[int, int, float, list[str], list[QuestionResult]]:
    """
    Compare student answers to the quiz key.
    Returns score, total, percentage, wrong_concepts, and per-question results.
    """
    total = len(questions)
    score = 0
    wrong_concepts: list[str] = []
    results: list[QuestionResult] = []

    for idx, question in enumerate(questions):
        key = str(idx)
        chosen = answers.get(key, "").strip().upper()
        correct = str(question.get("correct_answer", "")).strip().upper()
        is_correct = bool(chosen) and chosen == correct

        if is_correct:
            score += 1
        else:
            wrong_concepts.append(question.get("concept_tag") or "General")

        results.append(
            QuestionResult(
                question_index=idx,
                correct=is_correct,
                chosen=chosen or answers.get(key, ""),
                correct_answer=correct,
                explanation=question.get("explanation") if not is_correct else None,
                concept_tag=question.get("concept_tag"),
            )
        )

    percentage = round((score / total) * 100, 2) if total > 0 else 0.0
    return score, total, percentage, wrong_concepts, results


def aggregate_weak_concepts(
    wrong_concepts_lists: list[list[str] | None],
    top_n: int = 5,
) -> list[WeakConceptItem]:
    """Count concept_tag frequency across quiz attempts, return top N."""
    counts: dict[str, int] = {}
    for concepts in wrong_concepts_lists:
        if not concepts:
            continue
        for concept in concepts:
            counts[concept] = counts.get(concept, 0) + 1

    ranked = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:top_n]
    return [WeakConceptItem(concept=name, wrong_count=count) for name, count in ranked]
