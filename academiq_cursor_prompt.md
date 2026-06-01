# AcademiQ — Full Cursor AI Pro Prompt
> Paste this entire file into Cursor AI Chat as your first message.
> Then say: "Begin with step 1."

---

# PROJECT BRIEF: AcademiQ
**AI Academic Copilot for South Asian University Students**

You are a senior full-stack AI engineer helping me build "AcademiQ" — an AI-powered academic study assistant for university students in Bangladesh (BRAC, NSU, BUET). The app supports both Bengali and English.

This is a portfolio/research project for MS/PhD applications. Code quality, architecture, and documentation matter as much as functionality.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/ui |
| Backend | FastAPI (Python 3.11), SQLAlchemy, Alembic |
| LLM | Google Gemini 1.5 Flash via LangChain |
| Embeddings | Google text-embedding-004 |
| Vector Store | ChromaDB (local persistent) |
| Auth + Storage | Supabase (auth + file storage) |
| PDF Parsing | PyMuPDF (fitz) |
| Audio | OpenAI Whisper (base model, local) |
| Language Detection | langdetect |
| Charts | Recharts |
| Deployment | Vercel (frontend), Railway (backend + ChromaDB) |

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND — Next.js 14                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │PDF Upload│  │  Notes   │  │  Quiz    │  │ Chat Panel │  │
│  │    UI    │  │  Viewer  │  │Interface │  │ (WebSocket)│  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST + WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│                  BACKEND — FastAPI                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ /upload  │  │/generate │  │  /quiz   │  │  WS /chat  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                              │
│               AI PIPELINE — LangChain                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │PDF Parser│  │ Chunker  │  │   RAG    │  │  Prompt    │  │
│  │  + OCR   │  │+Embedder │  │Retriever │  │  Builder   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
┌──────▼───┐   ┌──────▼───┐   ┌─────▼──────┐
│ ChromaDB │   │Gemini 1.5│   │ PostgreSQL │
│  Vectors │   │  Flash   │   │  (Supabase)│
└──────────┘   └──────────┘   └────────────┘
       │                             │
┌──────▼───┐                  ┌──────▼─────┐
│text-emb  │                  │  Supabase  │
│  -004    │                  │Auth + S3   │
└──────────┘                  └────────────┘

Deploy: Railway (backend) · Vercel (frontend)
```

---

## FOLDER STRUCTURE

Generate this exact structure with all files (empty stubs are fine, we will fill them one by one):

```
academiq/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── upload/
│   │   │   │   └── page.tsx
│   │   │   ├── documents/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── quiz/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── chat/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx           ← landing page
│   ├── components/
│   │   ├── ui/                ← shadcn components go here
│   │   ├── UploadZone.tsx
│   │   ├── NotesViewer.tsx
│   │   ├── QuizCard.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── WeakConceptsCard.tsx
│   │   ├── DashboardStats.tsx
│   │   └── LanguageToggle.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── .env.local
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── documents.py
│   │   │   ├── generate.py
│   │   │   ├── quiz.py
│   │   │   └── chat.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── pdf_service.py
│   │   │   ├── embedding_service.py
│   │   │   ├── rag_service.py
│   │   │   ├── quiz_service.py
│   │   │   └── audio_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── language.py
│   │       └── prompts.py
│   ├── alembic/
│   │   └── versions/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
└── README.md
```

---

## DATABASE SCHEMA

Write all models in `backend/app/models.py` using SQLAlchemy 2.0 with UUID primary keys:

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email         = Column(String, unique=True, nullable=False)
    name          = Column(String)
    language_pref = Column(String, default="en")   # "en" or "bn"
    created_at    = Column(DateTime, default=datetime.utcnow)
    # relationships
    documents     = relationship("Document", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    sessions      = relationship("Session", back_populates="user")

class Document(Base):
    __tablename__ = "documents"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    filename     = Column(String, nullable=False)
    s3_key       = Column(String)                  # Supabase storage path
    status       = Column(String, default="processing")  # processing | ready | failed
    course_name  = Column(String)
    total_chunks = Column(Integer, default=0)
    uploaded_at  = Column(DateTime, default=datetime.utcnow)
    # relationships
    user         = relationship("User", back_populates="documents")
    chunks       = relationship("Chunk", back_populates="document")
    notes        = relationship("Note", back_populates="document")
    quizzes      = relationship("Quiz", back_populates="document")
    sessions     = relationship("Session", back_populates="document")

class Chunk(Base):
    __tablename__ = "chunks"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id      = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    content          = Column(Text, nullable=False)
    chroma_vector_id = Column(String)
    chunk_index      = Column(Integer)
    document         = relationship("Document", back_populates="chunks")

class Note(Base):
    __tablename__ = "notes"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id   = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    summary       = Column(Text)
    key_concepts  = Column(JSON)   # [{"concept": str, "explanation": str}]
    viva_questions = Column(JSON)  # [{"question": str, "answer": str}]
    language      = Column(String, default="en")
    created_at    = Column(DateTime, default=datetime.utcnow)
    document      = relationship("Document", back_populates="notes")

class Quiz(Base):
    __tablename__ = "quizzes"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    questions   = Column(JSON)     # see schema below
    difficulty  = Column(String)   # easy | medium | hard
    created_at  = Column(DateTime, default=datetime.utcnow)
    document    = relationship("Document", back_populates="quizzes")
    attempts    = relationship("QuizAttempt", back_populates="quiz")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id        = Column(UUID(as_uuid=True), ForeignKey("quizzes.id"), nullable=False)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    score          = Column(Integer)
    answers        = Column(JSON)          # {question_index: chosen_option}
    wrong_concepts = Column(JSON)          # [concept_tag strings]
    taken_at       = Column(DateTime, default=datetime.utcnow)
    quiz           = relationship("Quiz", back_populates="attempts")
    user           = relationship("User", back_populates="quiz_attempts")

class Session(Base):
    __tablename__ = "sessions"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    messages    = Column(JSON, default=list)  # [{role, content, timestamp}]
    updated_at  = Column(DateTime, default=datetime.utcnow)
    user        = relationship("User", back_populates="sessions")
    document    = relationship("Document", back_populates="sessions")
```

---

## BACKEND API ROUTES

### Route 1: `POST /api/documents/upload`

```
Input:  multipart/form-data { file: PDF, course_name: str, user_id: UUID }
Output: { document_id: UUID, status: str, total_chunks: int }

Steps:
1. Upload file to Supabase storage → get s3_key
2. Create Document row in DB with status="processing"
3. Extract text from PDF using PyMuPDF:
   - fitz.open(file_bytes)
   - extract text from all pages
   - concatenate with page separators
4. Split with RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
5. For each chunk:
   - embed with Google text-embedding-004
   - store in ChromaDB with metadata={document_id, user_id, chunk_index}
   - save Chunk row in DB with chroma_vector_id
6. Update Document: status="ready", total_chunks=len(chunks)
7. Return document_id
```

### Route 2: `POST /api/generate/notes`

```
Input:  { document_id: UUID, language: "en"|"bn" }
Output: { note_id: UUID, summary: str, key_concepts: [...], viva_questions: [...] }

Prompt template:
---
SYSTEM: You are an expert academic note-taker for university students.
Respond entirely in: {language}
(if language is "bn", write everything in Bengali script)

Given this lecture content from {course_name}:
{full_text}

Generate structured study notes as a JSON object with this exact schema:
{{
  "summary": "3-4 sentence overview of the entire lecture",
  "key_concepts": [
    {{
      "concept": "concept name",
      "explanation": "2-3 sentence explanation a student can understand"
    }}
  ],
  "viva_questions": [
    {{
      "question": "question a professor might ask in a viva/oral exam",
      "answer": "detailed model answer"
    }}
  ]
}}

Include 6-8 key concepts and 8-10 viva questions.
Return ONLY valid JSON. No markdown. No extra text.
---

Parse JSON safely. Retry once if malformed. Save to notes table.
```

### Route 3: `POST /api/quiz/generate`

```
Input:  { document_id: UUID, difficulty: "easy"|"medium"|"hard", num_questions: int = 10 }
Output: { quiz_id: UUID, questions: [...] }

Prompt template:
---
SYSTEM: You are an exam question setter for South Asian university courses.
Difficulty level: {difficulty}

Lecture content:
{retrieved_chunks}

Generate {num_questions} multiple choice questions.
Return a JSON array with this exact schema:
[
  {{
    "question": "clear question text",
    "options": {{
      "A": "option text",
      "B": "option text",
      "C": "option text",
      "D": "option text"
    }},
    "correct_answer": "A",
    "explanation": "why this answer is correct, 2-3 sentences",
    "concept_tag": "the main concept this question tests (e.g. 'Binary Search Trees')"
  }}
]

Difficulty guidelines:
- easy: direct recall, definitions
- medium: application, examples
- hard: analysis, edge cases, comparison

Return ONLY valid JSON array. No markdown. No extra text.
---
```

### Route 4: `POST /api/quiz/attempt`

```
Input:  { quiz_id: UUID, user_id: UUID, answers: {"0": "A", "1": "C", ...} }
Output: { score: int, total: int, percentage: float, wrong_concepts: [...], results: [...] }

Steps:
1. Load quiz from DB
2. Compare each answer to correct_answer
3. Collect concept_tag from every wrong answer → wrong_concepts list
4. Calculate score
5. Save QuizAttempt to DB
6. Return detailed results with explanations for wrong answers
```

### Route 5: `WebSocket /api/chat/{document_id}`

```
Message in:  { message: str, user_id: UUID, session_id: UUID|null }
Stream out:  tokens one by one, then { type: "done", session_id: UUID }

Steps:
1. Detect language of message using langdetect
2. Embed the message with text-embedding-004
3. ChromaDB similarity_search(query, k=5, filter={"document_id": document_id})
4. Load or create Session for this user+document
5. Build prompt (see below)
6. Stream Gemini 1.5 Flash response token by token via websocket.send_text()
7. After streaming done, append both messages to session.messages and save

Prompt template:
---
SYSTEM: You are AcademiQ, an intelligent study assistant for university students.
Detected language: {language} — respond in this language.
Course: {course_name}

Relevant lecture content:
{retrieved_chunks}

Conversation so far:
{last_3_messages}

Student question: {message}

Instructions:
- Answer clearly and helpfully
- Use examples relevant to Bangladesh or South Asia where helpful
- If the student seems confused, simplify your explanation
- End your response with exactly this line:
  "📌 Related concepts to review: [concept1, concept2, concept3]"
---
```

### Route 6: `POST /api/audio/transcribe`

```
Input:  multipart { file: audio (mp3/wav/m4a), course_name: str, user_id: UUID }
Output: { document_id: UUID, transcript_preview: str }

Steps:
1. Save audio to temp file
2. Run: whisper.load_model("base").transcribe(temp_file_path)
3. Get transcript text
4. Treat transcript as document text → run same chunking + embedding pipeline
5. Create Document row with filename="audio_transcript_{timestamp}"
6. Return document_id (same as PDF upload — user gets same notes/quiz/chat features)
```

### Route 7: `GET /api/analytics/weak-concepts/{user_id}`

```
Output: { weak_concepts: [{ concept: str, wrong_count: int }] }

Steps:
1. Load all QuizAttempts for user_id
2. Flatten all wrong_concepts lists
3. Count frequency of each concept string
4. Sort descending, return top 5
5. This powers the "Focus on these topics" card on the dashboard
```

---

## KEY SERVICE IMPLEMENTATIONS

### `backend/app/services/embedding_service.py`

```python
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.config import settings

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=settings.GOOGLE_API_KEY
)

vectorstore = Chroma(
    collection_name="academiq_docs",
    embedding_function=embeddings,
    persist_directory=settings.CHROMA_PERSIST_DIR
)

def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    return splitter.split_text(text)

def embed_and_store(chunks: list[str], document_id: str, user_id: str) -> list[str]:
    metadatas = [
        {"document_id": document_id, "user_id": user_id, "chunk_index": i}
        for i in range(len(chunks))
    ]
    ids = vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    return ids  # returns chroma vector IDs

def retrieve_relevant_chunks(query: str, document_id: str, k: int = 5) -> list[str]:
    results = vectorstore.similarity_search(
        query=query,
        k=k,
        filter={"document_id": document_id}
    )
    return [r.page_content for r in results]
```

### `backend/app/services/rag_service.py`

```python
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.3,
    streaming=True
)

async def stream_chat_response(
    question: str,
    chunks: list[str],
    course_name: str,
    language: str,
    last_messages: list[dict],
    websocket
):
    context = "\n\n---\n\n".join(chunks)
    history = "\n".join([
        f"{m['role'].upper()}: {m['content']}"
        for m in last_messages[-3:]  # last 3 messages for context
    ])

    prompt = f"""You are AcademiQ, an intelligent study assistant for university students.
Respond in: {language}
Course: {course_name}

Relevant lecture content:
{context}

Recent conversation:
{history}

Student question: {question}

Answer clearly. Use South Asian examples where helpful.
End with: "📌 Related concepts to review: [concept1, concept2, concept3]"
"""
    full_response = ""
    async for chunk in llm.astream(prompt):
        token = chunk.content
        full_response += token
        await websocket.send_text(token)

    await websocket.send_json({"type": "done"})
    return full_response

async def generate_with_llm(prompt: str) -> str:
    """Non-streaming generation for notes and quiz"""
    response = await llm.ainvoke(prompt)
    return response.content
```

### `backend/app/services/pdf_service.py`

```python
import fitz  # PyMuPDF

def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    full_text = ""
    for page_num, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            full_text += f"\n\n--- Page {page_num + 1} ---\n\n{text}"
    doc.close()
    return full_text.strip()
```

### `backend/app/utils/language.py`

```python
from langdetect import detect

def detect_language(text: str) -> str:
    """Returns 'bn' for Bengali, 'en' for English, defaults to 'en'"""
    try:
        lang = detect(text)
        return "bn" if lang == "bn" else "en"
    except Exception:
        return "en"

LANGUAGE_NAMES = {
    "en": "English",
    "bn": "Bengali (বাংলা)"
}
```

### `backend/app/utils/prompts.py`

```python
NOTES_PROMPT = """SYSTEM: You are an expert academic note-taker for university students.
Respond entirely in: {language}

Lecture content from {course_name}:
{full_text}

Generate structured study notes as JSON:
{{
  "summary": "3-4 sentence overview",
  "key_concepts": [
    {{"concept": "name", "explanation": "2-3 sentence explanation"}}
  ],
  "viva_questions": [
    {{"question": "viva question", "answer": "model answer"}}
  ]
}}

6-8 key concepts, 8-10 viva questions.
Return ONLY valid JSON. No markdown. No extra text."""

QUIZ_PROMPT = """SYSTEM: You are an exam question setter for South Asian university courses.
Difficulty: {difficulty}

Content:
{chunks}

Generate {num_questions} MCQ questions as JSON array:
[{{
  "question": "question text",
  "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
  "correct_answer": "A",
  "explanation": "why correct, 2-3 sentences",
  "concept_tag": "concept being tested"
}}]

Return ONLY valid JSON array. No markdown."""
```

---

## FRONTEND COMPONENTS

### `frontend/components/ChatPanel.tsx`

```tsx
"use client"
import { useState, useEffect, useRef } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export default function ChatPanel({ documentId, userId }: { documentId: string, userId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [detectedLang, setDetectedLang] = useState("English")
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/api/chat/${documentId}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "done") {
        setIsStreaming(false)
        return
      }
      if (data.language) setDetectedLang(data.language)

      // Append token to last assistant message
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + event.data }]
        }
        return [...prev, { role: "assistant", content: event.data, timestamp: new Date().toISOString() }]
      })
    }

    wsRef.current = ws
    return () => ws.close()
  }, [documentId])

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current) return
    const userMsg: Message = { role: "user", content: input, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    wsRef.current.send(JSON.stringify({ message: input, user_id: userId }))
    setInput("")
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-muted-foreground px-4 py-2 border-b">
        Responding in: {detectedLang}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 text-sm animate-pulse">...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-4 flex gap-2">
        <input
          className="flex-1 border rounded-md px-3 py-2 text-sm"
          placeholder="Ask anything about this lecture... (English or বাংলা)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          Send
        </button>
      </div>
    </div>
  )
}
```

### `frontend/components/UploadZone.tsx`

```tsx
"use client"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"

export default function UploadZone({ userId }: { userId: string }) {
  const [courseName, setCourseName] = useState("")
  const [language, setLanguage] = useState<"en" | "bn">("en")
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle")
  const router = useRouter()

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file || !courseName) return

    setStatus("uploading")
    setProgress(20)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("course_name", courseName)
    formData.append("user_id", userId)
    formData.append("language", language)

    try {
      setProgress(50)
      setStatus("processing")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      setProgress(100)
      setStatus("done")
      router.push(`/documents/${data.document_id}`)
    } catch {
      setStatus("error")
    }
  }, [courseName, language, userId, router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  })

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <input
        className="w-full border rounded-md px-3 py-2"
        placeholder="Course name (e.g. CSE-330 Operating Systems)"
        value={courseName}
        onChange={e => setCourseName(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={() => setLanguage("en")}
          className={`px-4 py-2 rounded-md text-sm border ${language === "en" ? "bg-primary text-primary-foreground" : ""}`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage("bn")}
          className={`px-4 py-2 rounded-md text-sm border ${language === "bn" ? "bg-primary text-primary-foreground" : ""}`}
        >
          বাংলা
        </button>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">📄</div>
        <p className="text-sm text-muted-foreground">
          {isDragActive ? "Drop your PDF here" : "Drag & drop a lecture PDF, or click to browse"}
        </p>
      </div>

      {status !== "idle" && (
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-muted-foreground text-center capitalize">{status}...</p>
        </div>
      )}
    </div>
  )
}
```

---

## ENVIRONMENT VARIABLES

### `backend/.env`

```bash
DATABASE_URL=postgresql://postgres:password@db.your-supabase-id.supabase.co:5432/postgres
GOOGLE_API_KEY=your_google_gemini_api_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
CHROMA_PERSIST_DIR=./chroma_db
SECRET_KEY=your_random_secret_key_for_jwt
```

### `frontend/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## REQUIREMENTS.TXT

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
python-multipart==0.0.9
langchain==0.2.0
langchain-google-genai==1.0.5
langchain-chroma==0.1.1
chromadb==0.5.0
pymupdf==1.24.3
openai-whisper==20231117
langdetect==1.0.9
pydantic==2.7.1
pydantic-settings==2.3.0
python-dotenv==1.0.1
httpx==0.27.0
supabase==2.5.0
python-jose[cryptography]==3.3.0
```

---

## DOCKERFILE (backend)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## MAIN.PY SKELETON

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents, generate, quiz, chat, auth
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AcademiQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-vercel-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/health")
async def health(): return {"status": "ok", "service": "AcademiQ API"}
```

---

## PAGES SPECIFICATION

### `/dashboard`
Display:
- Grid of uploaded documents (filename, course name, status badge: processing/ready/failed)
- "Weak concepts" card — fetch from `GET /api/analytics/weak-concepts/{user_id}` — show as horizontal bar chart
- Recent quiz scores — Recharts BarChart — last 5 attempts
- Study streak counter (days in a row with activity)
- "Upload new lecture" CTA button

### `/upload`
- Course name text input (required)
- Language toggle: English / বাংলা
- Drag-and-drop zone (react-dropzone, PDF only)
- Progress bar with status text: "Uploading..." → "Extracting text..." → "Creating embeddings..." → "Ready!"
- On success: auto-redirect to `/documents/[id]`

### `/documents/[id]`
Three tabs using Shadcn Tabs component:

**Tab 1 — Notes**
- Summary section (paragraph)
- Key concepts: expandable accordion cards (concept name → click to expand → explanation)
- Viva Q&A: list of questions, click to reveal answer
- "Regenerate in Bengali" / "Regenerate in English" button

**Tab 2 — Quiz**
- Difficulty selector: Easy / Medium / Hard (button group)
- Number of questions slider: 5-20
- "Generate Quiz" button
- Quiz UI: one question at a time, A/B/C/D option buttons
- After submission: score screen with correct/incorrect breakdown
- "Wrong concepts" list from this attempt

**Tab 3 — Chat**
- Full ChatPanel component
- Language indicator badge at top
- WebSocket streaming

### `/dashboard` Weak Concepts Card (important for research angle)
```
┌─────────────────────────────────┐
│ 📌 Focus on these topics        │
│                                 │
│ Binary Search Trees    ████ 4   │
│ Dynamic Programming    ███  3   │
│ OS Scheduling          ██   2   │
│ Recursion              ██   2   │
│ Graph Traversal        █    1   │
│                                 │
│ Based on your last 5 quizzes    │
└─────────────────────────────────┘
```

---

## CRITICAL IMPLEMENTATION RULES

1. **ChromaDB must filter by document_id** — every similarity_search call MUST include `filter={"document_id": str(document_id)}`. Without this, one user's lecture content leaks into another user's RAG context. This is a security bug.

2. **JSON parsing safety** — all LLM responses that return JSON must be wrapped:
   ```python
   import json, re
   def safe_parse_json(text: str) -> dict:
       try:
           # Strip markdown code fences if present
           clean = re.sub(r'```json|```', '', text).strip()
           return json.loads(clean)
       except json.JSONDecodeError:
           raise ValueError(f"LLM returned invalid JSON: {text[:200]}")
   ```
   Retry the LLM call once if parsing fails.

3. **All FastAPI endpoints must be async** — use `async def` everywhere. Use `asyncio.to_thread()` for blocking calls (PyMuPDF, Whisper).

4. **WebSocket streaming** — send tokens as they arrive from Gemini. Do NOT buffer the full response. Send a final `{"type": "done"}` JSON message when complete.

5. **concept_tag in quiz questions** — this field is mandatory. It drives the weak concept analytics. If the LLM omits it, default to "General" but log a warning.

6. **Language detection flow**:
   - User sends message → detect language → use that language for LLM response
   - User's `language_pref` in DB is their default, but per-message detection overrides it
   - Send detected language back to frontend: `{"type": "language", "value": "Bengali (বাংলা)"}`

7. **Error handling** — every router endpoint must return a consistent error format:
   ```python
   {"error": True, "message": "Human-readable error", "code": "ERROR_CODE"}
   ```

---

## BUILD ORDER — Follow this exactly

Build files in this order. After finishing each file, stop and say:
**"✅ [filename] complete. Ready for next file?"**

Wait for my "yes" before continuing.

```
ORDER:
 1. backend/app/database.py
 2. backend/app/models.py
 3. backend/app/schemas.py
 4. backend/app/utils/prompts.py
 5. backend/app/utils/language.py
 6. backend/app/services/pdf_service.py
 7. backend/app/services/embedding_service.py
 8. backend/app/services/rag_service.py
 9. backend/app/services/quiz_service.py
10. backend/app/services/audio_service.py
11. backend/app/routers/documents.py
12. backend/app/routers/generate.py
13. backend/app/routers/quiz.py
14. backend/app/routers/chat.py
15. backend/app/main.py
16. backend/requirements.txt
17. backend/Dockerfile
18. frontend/lib/supabase.ts
19. frontend/lib/api.ts
20. frontend/types/index.ts
21. frontend/app/(auth)/login/page.tsx
22. frontend/app/(auth)/signup/page.tsx
23. frontend/components/UploadZone.tsx
24. frontend/components/ChatPanel.tsx
25. frontend/components/NotesViewer.tsx
26. frontend/components/QuizCard.tsx
27. frontend/components/WeakConceptsCard.tsx
28. frontend/components/DashboardStats.tsx
29. frontend/app/(dashboard)/layout.tsx
30. frontend/app/(dashboard)/dashboard/page.tsx
31. frontend/app/(dashboard)/upload/page.tsx
32. frontend/app/(dashboard)/documents/[id]/page.tsx
33. README.md
```

---

## README SKELETON (fill after building)

The README must include these sections for the research portfolio:

```markdown
# AcademiQ — AI Academic Copilot

> An AI-powered study assistant for South Asian university students.
> Supports Bengali and English. Built with RAG, LLMs, and multilingual NLP.

## Problem Statement
[Why this matters for students in Bangladesh]

## Architecture
[Insert architecture diagram image here]

## Features
- PDF lecture → auto-generated notes (Bengali + English)
- AI-powered MCQ quiz generation with difficulty levels
- Streaming RAG chat over lecture content
- Weak concept tracker across quiz attempts
- Audio lecture transcription → study material
- Bilingual support: Bengali and English

## Tech Stack
[Table of technologies]

## Evaluation
| Metric | Result |
|---|---|
| Answer accuracy on BRAC CSE lectures | TBD |
| Bangla note generation quality (manual eval, n=20) | TBD |
| Average quiz generation time | TBD |
| User language preference split | TBD |

## Setup & Installation
[Step-by-step instructions]

## Limitations & Future Work
- Currently limited to text PDFs (scanned PDF OCR is partial)
- Whisper base model may struggle with Bangladeshi English accents
- Future: fine-tuned BanglaBERT for better Bengali embeddings
- Future: spaced repetition scheduling based on weak concept scores
- Future: collaborative study rooms

## Research Motivation
[2-3 sentences you can copy into your SOP]
```

---

## BEGIN

Start with **Step 1: generate the full folder structure** with empty stub files.
Then proceed to Step 2 (database.py) and wait for my confirmation at each step.
