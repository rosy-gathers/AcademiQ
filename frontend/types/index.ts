export type LanguageCode = "en" | "bn";
export type LanguageOverride = "auto" | LanguageCode;

export type DocumentStatus = "processing" | "ready" | "failed";

export type QuizDifficulty = "easy" | "medium" | "hard";

export interface KeyConcept {
  concept: string;
  explanation: string;
}

export interface VivaQuestion {
  question: string;
  answer: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  status: string;
  total_chunks: number;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  s3_key?: string | null;
  status: DocumentStatus | string;
  course_name?: string | null;
  folder?: string | null;
  tags?: string[];
  source_type?: "pdf" | "audio" | string;
  language_override?: LanguageOverride | string;
  duration_seconds?: number | null;
  total_chunks: number;
  uploaded_at: string;
}

export interface DocumentListResponse {
  documents: Document[];
}

export interface DocumentLabelsResponse {
  folders: string[];
  tags: string[];
}

export interface DocumentSearchHit {
  document_id: string;
  filename: string;
  course_name?: string | null;
  folder?: string | null;
  tags?: string[];
  status: string;
  source_type?: string;
  uploaded_at: string;
  score: number;
  snippet: string;
  match_in: string[];
}

export interface DocumentSearchResponse {
  query: string;
  results: DocumentSearchHit[];
  total: number;
}

export type DocumentResponse = Document;

export interface GenerateNotesResponse {
  note_id: string;
  summary: string;
  key_concepts: KeyConcept[];
  viva_questions: VivaQuestion[];
}

export interface NoteResponse {
  id: string;
  document_id: string;
  summary?: string | null;
  key_concepts?: KeyConcept[] | null;
  viva_questions?: VivaQuestion[] | null;
  language: string;
  created_at: string;
}

export interface MCQOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QuizQuestion {
  question: string;
  options: MCQOptions | Record<string, string>;
  correct_answer: "A" | "B" | "C" | "D";
  explanation?: string | null;
  concept_tag: string;
}

export interface QuizGenerateResponse {
  quiz_id: string;
  questions: QuizQuestion[];
  source_citations?: SourceCitation[];
}

export interface QuizResponse {
  id: string;
  document_id: string;
  questions: QuizQuestion[];
  difficulty: string;
  created_at: string;
}

export interface SourceCitation {
  index: number;
  chunk_index: number;
  excerpt: string;
}

export interface QuestionResult {
  question_index: number;
  correct: boolean;
  chosen: string;
  correct_answer: string;
  explanation?: string | null;
  concept_tag?: string | null;
  sources?: SourceCitation[];
}

export interface QuizAttemptResponse {
  score: number;
  total: number;
  percentage: number;
  wrong_concepts: string[];
  results: QuestionResult[];
  mode?: string;
  time_limit_seconds?: number | null;
  elapsed_seconds?: number | null;
  attempt_id?: string | null;
}

export interface QuizAttemptSummary {
  quiz_id: string;
  score: number;
  total: number;
  percentage: number;
  taken_at: string;
}

export interface QuizAttemptListResponse {
  attempts: QuizAttemptSummary[];
}

export interface AudioTranscribeResponse {
  document_id: string;
  transcript_preview: string;
  duration_seconds?: number;
  chapter_count?: number;
  segment_count?: number;
  speakers?: string[];
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
  chapter_id?: number | null;
}

export interface TranscriptChapter {
  id: number;
  title: string;
  start: number;
  end: number;
  segment_count: number;
}

export interface TranscriptResponse {
  document_id: string;
  duration_seconds: number;
  speakers: string[];
  chapters: TranscriptChapter[];
  segments: TranscriptSegment[];
  full_text: string;
}

export interface WeakConceptItem {
  concept: string;
  wrong_count: number;
}

export interface WeakConceptsResponse {
  weak_concepts: WeakConceptItem[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: SourceCitation[];
}

export interface StudyPlanItem {
  id: string;
  user_id: string;
  document_id?: string | null;
  document_filename?: string | null;
  title: string;
  due_at: string;
  remind_days_before: number;
  completed: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface StudyPlanListResponse {
  items: StudyPlanItem[];
}

export type FlashcardRating = "again" | "hard" | "good" | "easy";

export interface Flashcard {
  id: string;
  user_id: string;
  document_id?: string | null;
  document_filename?: string | null;
  front: string;
  back: string;
  source: string;
  concept_tag?: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at?: string | null;
  created_at: string;
}

export interface FlashcardListResponse {
  cards: Flashcard[];
  due_count: number;
}

export interface FlashcardGenerateResponse {
  created: number;
  skipped: number;
  cards: Flashcard[];
}
