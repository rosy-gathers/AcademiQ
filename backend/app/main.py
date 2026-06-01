import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import reload_settings
from app.database import Base, engine
from app.routers import auth, chat, documents, export, flashcards, generate, quiz, study_plans
from app.services.embedding_service import reset_embedding_clients
from app.services.rag_service import reset_llm_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = reload_settings()
    reset_embedding_clients()
    reset_llm_client()

    if settings.GOOGLE_API_KEY:
        print(f"Google API Key loaded: {settings.GOOGLE_API_KEY[:8]}...")
    else:
        print("Google API Key loaded: (missing — set GOOGLE_API_KEY in backend/.env)")
    print(f"Gemini model: {settings.GEMINI_MODEL}")

    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified")
    except Exception as exc:
        logger.warning("Database not reachable on startup: %s", exc)
    yield


app = FastAPI(title="AcademiQ API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://academi-q-one.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(documents.audio_router, prefix="/api/audio", tags=["audio"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(quiz.analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(study_plans.router, prefix="/api/study-plans", tags=["study-plans"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["flashcards"])
app.include_router(export.router, prefix="/api/export", tags=["export"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AcademiQ API"}
