import type {
  AudioTranscribeResponse,
  DocumentLabelsResponse,
  DocumentListResponse,
  DocumentSearchResponse,
  DocumentResponse,
  DocumentUploadResponse,
  GenerateNotesResponse,
  LanguageCode,
  NoteResponse,
  QuizAttemptListResponse,
  QuizAttemptResponse,
  QuizGenerateResponse,
  QuizResponse,
  Flashcard,
  FlashcardGenerateResponse,
  FlashcardListResponse,
  FlashcardRating,
  StudyPlanItem,
  StudyPlanListResponse,
  TranscriptResponse,
  WeakConceptsResponse,
} from "@/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export class ApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

type ErrorBody = {
  error?: boolean;
  message?: string;
  code?: string;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & ErrorBody;
  if (!res.ok || data.error) {
    throw new ApiError(
      data.message ?? `Request failed (${res.status})`,
      data.code ?? "REQUEST_FAILED"
    );
  }
  return data;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  return parseResponse<T>(res);
}

export function getChatWebSocketUrl(documentId: string): string {
  const base = WS_URL.replace(/\/$/, "");
  return `${base}/api/chat/${documentId}`;
}

export async function deleteDocument(
  documentId: string
): Promise<{ deleted: boolean; document_id: string }> {
  const res = await fetch(`${API_URL}/api/documents/${documentId}`, {
    method: "DELETE",
  });
  return parseResponse(res);
}

export async function syncUser(
  userId: string,
  userEmail: string
): Promise<void> {
  await request("/api/auth/sync-user", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      user_email: userEmail,
    }),
  });
}

export async function uploadDocument(
  formData: FormData
): Promise<DocumentUploadResponse> {
  const res = await fetch(`${API_URL}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as DocumentUploadResponse & ErrorBody;
  if (data.document_id) {
    return data;
  }
  if (!res.ok || data.error) {
    throw new ApiError(
      data.message ?? `Request failed (${res.status})`,
      data.code ?? "REQUEST_FAILED"
    );
  }
  throw new ApiError("Upload response missing document_id", "INVALID_RESPONSE");
}

export async function transcribeAudio(
  formData: FormData
): Promise<AudioTranscribeResponse> {
  const res = await fetch(`${API_URL}/api/audio/transcribe`, {
    method: "POST",
    body: formData,
  });
  return parseResponse<AudioTranscribeResponse>(res);
}

export async function getAudioTranscript(
  documentId: string
): Promise<TranscriptResponse> {
  return request<TranscriptResponse>(`/api/audio/transcript/${documentId}`);
}

export async function listDocuments(
  userId: string,
  filters?: { folder?: string; tag?: string }
): Promise<DocumentListResponse> {
  const params = new URLSearchParams();
  if (filters?.folder) params.set("folder", filters.folder);
  if (filters?.tag) params.set("tag", filters.tag);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return request<DocumentListResponse>(
    `/api/documents/user/${userId}${suffix}`
  );
}

export async function getDocumentLabels(
  userId: string
): Promise<DocumentLabelsResponse> {
  return request<DocumentLabelsResponse>(
    `/api/documents/user/${userId}/labels`
  );
}

export async function searchDocuments(
  userId: string,
  query: string,
  filters?: { folder?: string; tag?: string; limit?: number }
): Promise<DocumentSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (filters?.folder) params.set("folder", filters.folder);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.limit) params.set("limit", String(filters.limit));
  return request<DocumentSearchResponse>(
    `/api/documents/user/${userId}/search?${params.toString()}`
  );
}

export async function getDocument(
  documentId: string
): Promise<DocumentResponse> {
  return request<DocumentResponse>(`/api/documents/${documentId}`);
}

export async function updateDocumentLanguage(
  documentId: string,
  languageOverride: "auto" | "en" | "bn"
): Promise<DocumentResponse> {
  return request<DocumentResponse>(`/api/documents/${documentId}/language`, {
    method: "PATCH",
    body: JSON.stringify({ language_override: languageOverride }),
  });
}

export async function updateDocumentOrganization(
  documentId: string,
  payload: { folder: string | null; tags: string[] }
): Promise<DocumentResponse> {
  return request<DocumentResponse>(
    `/api/documents/${documentId}/organization`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function generateNotes(
  documentId: string,
  language: LanguageCode,
  userEmail?: string
): Promise<GenerateNotesResponse> {
  return request<GenerateNotesResponse>("/api/generate/notes", {
    method: "POST",
    body: JSON.stringify({
      document_id: documentId,
      language,
      user_email: userEmail ?? null,
    }),
  });
}

export async function getNotes(documentId: string): Promise<NoteResponse> {
  return request<NoteResponse>(`/api/generate/notes/${documentId}`);
}

export async function generateQuiz(
  documentId: string,
  difficulty: "easy" | "medium" | "hard",
  numQuestions: number = 10,
  examMode = false
): Promise<QuizGenerateResponse> {
  return request<QuizGenerateResponse>("/api/quiz/generate", {
    method: "POST",
    body: JSON.stringify({
      document_id: documentId,
      difficulty,
      num_questions: numQuestions,
      exam_mode: examMode,
    }),
  });
}

export async function getQuiz(quizId: string): Promise<QuizResponse> {
  return request<QuizResponse>(`/api/quiz/${quizId}`);
}

export async function submitQuizAttempt(
  quizId: string,
  userId: string,
  answers: Record<string, string>,
  options?: {
    userEmail?: string;
    mode?: "practice" | "exam";
    timeLimitSeconds?: number;
    elapsedSeconds?: number;
  }
): Promise<QuizAttemptResponse> {
  return request<QuizAttemptResponse>("/api/quiz/attempt", {
    method: "POST",
    body: JSON.stringify({
      quiz_id: quizId,
      user_id: userId,
      user_email: options?.userEmail ?? null,
      answers,
      mode: options?.mode ?? "practice",
      time_limit_seconds: options?.timeLimitSeconds ?? null,
      elapsed_seconds: options?.elapsedSeconds ?? null,
    }),
  });
}

export async function listQuizAttempts(
  userId: string
): Promise<QuizAttemptListResponse> {
  return request<QuizAttemptListResponse>(`/api/quiz/attempts/user/${userId}`);
}

export async function getWeakConcepts(
  userId: string
): Promise<WeakConceptsResponse> {
  return request<WeakConceptsResponse>(
    `/api/analytics/weak-concepts/${userId}`
  );
}

export async function checkHealth(): Promise<{ status: string; service: string }> {
  return request("/health");
}

export async function listStudyPlanItems(
  userId: string,
  options?: {
    from?: string;
    to?: string;
    includeCompleted?: boolean;
  }
): Promise<StudyPlanListResponse> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.includeCompleted === false) params.set("include_completed", "false");
  const qs = params.toString();
  return request<StudyPlanListResponse>(
    `/api/study-plans/user/${userId}${qs ? `?${qs}` : ""}`
  );
}

export async function listStudyPlanReminders(
  userId: string
): Promise<StudyPlanListResponse> {
  return request<StudyPlanListResponse>(
    `/api/study-plans/reminders/${userId}`
  );
}

export async function createStudyPlanItem(body: {
  user_id: string;
  title: string;
  due_at: string;
  document_id?: string | null;
  remind_days_before?: number;
}): Promise<StudyPlanItem> {
  return request<StudyPlanItem>("/api/study-plans", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateStudyPlanItem(
  itemId: string,
  body: {
    title?: string;
    due_at?: string;
    document_id?: string | null;
    remind_days_before?: number;
    completed?: boolean;
  }
): Promise<StudyPlanItem> {
  return request<StudyPlanItem>(`/api/study-plans/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function listFlashcards(
  userId: string,
  dueOnly = false
): Promise<FlashcardListResponse> {
  const qs = dueOnly ? "?due_only=true" : "";
  return request<FlashcardListResponse>(`/api/flashcards/user/${userId}${qs}`);
}

export async function createFlashcard(body: {
  user_id: string;
  front: string;
  back: string;
  document_id?: string | null;
}): Promise<Flashcard> {
  return request<Flashcard>("/api/flashcards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function generateFlashcardsFromNotes(
  userId: string,
  documentId: string
): Promise<FlashcardGenerateResponse> {
  return request<FlashcardGenerateResponse>("/api/flashcards/generate-from-notes", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, document_id: documentId }),
  });
}

export async function generateFlashcardsFromWeakConcepts(
  userId: string
): Promise<FlashcardGenerateResponse> {
  return request<FlashcardGenerateResponse>(
    "/api/flashcards/generate-from-weak-concepts",
    {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }
  );
}

export async function reviewFlashcard(
  cardId: string,
  rating: FlashcardRating
): Promise<Flashcard> {
  return request<Flashcard>(`/api/flashcards/${cardId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
}

export async function deleteFlashcard(cardId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/flashcards/${cardId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const data = (await res.json()) as { message?: string; code?: string };
    throw new ApiError(
      data.message ?? `Request failed (${res.status})`,
      data.code ?? "REQUEST_FAILED"
    );
  }
}

export async function deleteStudyPlanItem(itemId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/study-plans/${itemId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const data = (await res.json()) as { message?: string; code?: string };
    throw new ApiError(
      data.message ?? `Request failed (${res.status})`,
      data.code ?? "REQUEST_FAILED"
    );
  }
}
