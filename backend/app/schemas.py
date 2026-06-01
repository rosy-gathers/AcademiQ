from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# --- Shared / errors ---


class SourceCitation(BaseModel):
    index: int
    chunk_index: int
    excerpt: str


class ErrorResponse(BaseModel):
    error: bool = True
    message: str
    code: str


# --- User ---


class UserBase(BaseModel):
    email: str
    name: str | None = None
    language_pref: Literal["en", "bn"] = "en"


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


# --- Document ---


class DocumentUploadResponse(BaseModel):
    document_id: UUID
    status: str
    total_chunks: int


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    filename: str
    s3_key: str | None = None
    status: str
    course_name: str | None = None
    folder: str | None = None
    tags: list[str] = Field(default_factory=list)
    source_type: str = "pdf"
    language_override: Literal["auto", "en", "bn"] = "auto"
    duration_seconds: int | None = None
    total_chunks: int
    uploaded_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_tags(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(t) for t in value if isinstance(t, str) and t.strip()]
        return []


class DocumentLanguageUpdate(BaseModel):
    language_override: Literal["auto", "en", "bn"]


class DocumentOrganizationUpdate(BaseModel):
    folder: str | None = None
    tags: list[str] = Field(default_factory=list)


class DocumentLabelsResponse(BaseModel):
    folders: list[str]
    tags: list[str]


class DocumentSearchHit(BaseModel):
    document_id: UUID
    filename: str
    course_name: str | None = None
    folder: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: str
    source_type: str = "pdf"
    uploaded_at: datetime
    score: float
    snippet: str
    match_in: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_search_tags(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(t) for t in value if isinstance(t, str) and t.strip()]
        return []


class DocumentSearchResponse(BaseModel):
    query: str
    results: list[DocumentSearchHit]
    total: int


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker: str | None = None
    chapter_id: int | None = None


class TranscriptChapter(BaseModel):
    id: int
    title: str
    start: float
    end: float
    segment_count: int


class TranscriptResponse(BaseModel):
    document_id: UUID
    duration_seconds: float
    speakers: list[str]
    chapters: list[TranscriptChapter]
    segments: list[TranscriptSegment]
    full_text: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


# --- Notes ---


class KeyConcept(BaseModel):
    concept: str
    explanation: str


class VivaQuestion(BaseModel):
    question: str
    answer: str


class NotesContent(BaseModel):
    """LLM JSON shape for generated notes."""

    summary: str
    key_concepts: list[KeyConcept]
    viva_questions: list[VivaQuestion]


class GenerateNotesRequest(BaseModel):
    document_id: UUID
    language: Literal["en", "bn"]


class GenerateNotesResponse(BaseModel):
    note_id: UUID
    summary: str
    key_concepts: list[KeyConcept]
    viva_questions: list[VivaQuestion]


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    summary: str | None = None
    key_concepts: list[KeyConcept] | list[dict[str, Any]] | None = None
    viva_questions: list[VivaQuestion] | list[dict[str, Any]] | None = None
    language: str
    created_at: datetime


# --- Quiz ---


class MCQOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str


class QuizQuestion(BaseModel):
    question: str
    options: MCQOptions | dict[str, str]
    correct_answer: Literal["A", "B", "C", "D"]
    explanation: str | None = None
    concept_tag: str


class QuizGenerateRequest(BaseModel):
    document_id: UUID
    difficulty: Literal["easy", "medium", "hard"]
    num_questions: int = Field(default=10, ge=5, le=20)
    exam_mode: bool = False


class QuizGenerateResponse(BaseModel):
    quiz_id: UUID
    questions: list[QuizQuestion]
    source_citations: list[SourceCitation] = []


class QuizAttemptRequest(BaseModel):
    quiz_id: UUID
    user_id: UUID
    answers: dict[str, str]  # {"0": "A", "1": "C", ...}
    mode: Literal["practice", "exam"] = "practice"
    time_limit_seconds: int | None = None
    elapsed_seconds: int | None = None


class QuestionResult(BaseModel):
    question_index: int
    correct: bool
    chosen: str
    correct_answer: str
    explanation: str | None = None
    concept_tag: str | None = None
    sources: list[SourceCitation] = []


class QuizAttemptResponse(BaseModel):
    score: int
    total: int
    percentage: float
    wrong_concepts: list[str]
    results: list[QuestionResult]
    mode: str = "practice"
    time_limit_seconds: int | None = None
    elapsed_seconds: int | None = None
    attempt_id: UUID | None = None


class QuizAttemptSummary(BaseModel):
    quiz_id: UUID
    score: int
    total: int
    percentage: float
    taken_at: datetime


class QuizAttemptListResponse(BaseModel):
    attempts: list[QuizAttemptSummary]


class QuizResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    questions: list[QuizQuestion] | list[dict[str, Any]]
    difficulty: str
    source_citations: list[SourceCitation] | list[dict[str, Any]] = []
    created_at: datetime


# --- Chat ---


class ChatMessageIn(BaseModel):
    message: str
    user_id: UUID
    session_id: UUID | None = None


class ChatMessageRecord(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: str


class ChatDoneMessage(BaseModel):
    type: Literal["done"] = "done"
    session_id: UUID


class ChatLanguageMessage(BaseModel):
    type: Literal["language"] = "language"
    value: str


# --- Audio ---


class AudioTranscribeResponse(BaseModel):
    document_id: UUID
    transcript_preview: str
    duration_seconds: float = 0
    chapter_count: int = 0
    segment_count: int = 0
    speakers: list[str] = []


# --- Analytics ---


class WeakConceptItem(BaseModel):
    concept: str
    wrong_count: int


class WeakConceptsResponse(BaseModel):
    weak_concepts: list[WeakConceptItem]


# --- Study plan ---


class StudyPlanItemCreate(BaseModel):
    user_id: UUID
    title: str = Field(min_length=1, max_length=200)
    due_at: datetime
    document_id: UUID | None = None
    remind_days_before: int = Field(default=1, ge=0, le=30)


class StudyPlanItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    due_at: datetime | None = None
    document_id: UUID | None = None
    remind_days_before: int | None = Field(default=None, ge=0, le=30)
    completed: bool | None = None


class StudyPlanItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    document_id: UUID | None = None
    document_filename: str | None = None
    title: str
    due_at: datetime
    remind_days_before: int
    completed: bool
    created_at: datetime
    updated_at: datetime | None = None


class StudyPlanListResponse(BaseModel):
    items: list[StudyPlanItemResponse]


# --- Flashcards ---


class FlashcardCreate(BaseModel):
    user_id: UUID
    front: str = Field(min_length=1)
    back: str = Field(min_length=1)
    document_id: UUID | None = None


class FlashcardGenerateFromNotesRequest(BaseModel):
    user_id: UUID
    document_id: UUID


class FlashcardGenerateWeakRequest(BaseModel):
    user_id: UUID


class FlashcardReviewRequest(BaseModel):
    rating: Literal["again", "hard", "good", "easy"]


class FlashcardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    document_id: UUID | None = None
    document_filename: str | None = None
    front: str
    back: str
    source: str
    concept_tag: str | None = None
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_at: datetime
    last_reviewed_at: datetime | None = None
    created_at: datetime


class FlashcardListResponse(BaseModel):
    cards: list[FlashcardResponse]
    due_count: int = 0


class FlashcardGenerateResponse(BaseModel):
    created: int
    skipped: int
    cards: list[FlashcardResponse]


# --- Health ---


class HealthResponse(BaseModel):
    status: str
    service: str
