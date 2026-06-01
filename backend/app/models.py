import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.database import Base


def _default_messages() -> list:
    return []


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    language_pref = Column(String, default="en")  # "en" or "bn"
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    study_plan_items = relationship("StudyPlanItem", back_populates="user")
    flashcards = relationship("Flashcard", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    s3_key = Column(String)
    status = Column(String, default="processing")  # processing | ready | failed
    course_name = Column(String)
    folder = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    source_type = Column(String, default="pdf")  # pdf | audio
    language_override = Column(String, default="auto")  # auto | en | bn
    transcript_data = Column(JSON, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    total_chunks = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document")
    notes = relationship("Note", back_populates="document")
    quizzes = relationship("Quiz", back_populates="document")
    sessions = relationship("Session", back_populates="document")
    study_plan_items = relationship("StudyPlanItem", back_populates="document")
    flashcards = relationship("Flashcard", back_populates="document")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    content = Column(Text, nullable=False)
    chroma_vector_id = Column(String)
    chunk_index = Column(Integer)

    document = relationship("Document", back_populates="chunks")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    summary = Column(Text)
    key_concepts = Column(JSON)  # [{"concept": str, "explanation": str}]
    viva_questions = Column(JSON)  # [{"question": str, "answer": str}]
    language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="notes")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    questions = Column(JSON)
    difficulty = Column(String)  # easy | medium | hard
    source_citations = Column(JSON)  # [{index, chunk_index, excerpt}, ...]
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(Uuid(as_uuid=True), ForeignKey("quizzes.id"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    score = Column(Integer)
    answers = Column(JSON)  # {question_index: chosen_option}
    wrong_concepts = Column(JSON)  # [concept_tag strings]
    mode = Column(String, default="practice")  # practice | exam
    time_limit_seconds = Column(Integer, nullable=True)
    elapsed_seconds = Column(Integer, nullable=True)
    taken_at = Column(DateTime, default=datetime.utcnow)

    quiz = relationship("Quiz", back_populates="attempts")
    user = relationship("User", back_populates="quiz_attempts")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id"))
    messages = Column(JSON, default=_default_messages)  # [{role, content, timestamp}]
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    document = relationship("Document", back_populates="sessions")


class StudyPlanItem(Base):
    __tablename__ = "study_plan_items"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    title = Column(String, nullable=False)
    due_at = Column(DateTime, nullable=False)
    remind_days_before = Column(Integer, default=1)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="study_plan_items")
    document = relationship("Document", back_populates="study_plan_items")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_id = Column(Uuid(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    source = Column(String, default="manual")  # manual | notes | weak_concept
    concept_tag = Column(String, nullable=True)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=0)
    repetitions = Column(Integer, default=0)
    next_review_at = Column(DateTime, default=datetime.utcnow)
    last_reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="flashcards")
    document = relationship("Document", back_populates="flashcards")
