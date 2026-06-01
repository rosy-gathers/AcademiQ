from uuid import UUID

from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings

_llm: ChatGoogleGenerativeAI | None = None


def _get_llm() -> ChatGoogleGenerativeAI:
    """Lazy-init LLM so GEMINI_MODEL is read from settings at runtime."""
    global _llm
    settings = get_settings()
    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not set in backend/.env")
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
            streaming=True,
        )
    return _llm


def reset_llm_client() -> None:
    """Drop cached LLM after settings reload (dev restarts)."""
    global _llm
    _llm = None


async def stream_chat_response(
    question: str,
    chunks: list[str],
    course_name: str,
    language: str,
    last_messages: list[dict],
    websocket,
    session_id: UUID | None = None,
    source_citations: list[dict] | None = None,
) -> str:
    llm = _get_llm()
    context = "\n\n---\n\n".join(chunks)
    history = "\n".join(
        [
            f"{m['role'].upper()}: {m['content']}"
            for m in last_messages[-3:]
        ]
    )

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
        if not token:
            continue
        full_response += token
        await websocket.send_text(token)

    done_payload: dict = {"type": "done"}
    if session_id is not None:
        done_payload["session_id"] = str(session_id)
    if source_citations:
        done_payload["sources"] = source_citations
    await websocket.send_json(done_payload)
    return full_response


async def generate_with_llm(prompt: str) -> str:
    """Non-streaming generation for notes and quiz."""
    response = await _get_llm().ainvoke(prompt)
    return response.content
