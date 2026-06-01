from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.config import get_settings

_embeddings: GoogleGenerativeAIEmbeddings | None = None
_vectorstore: Chroma | None = None


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    """Lazy-init so GOOGLE_API_KEY is read from settings at runtime, not import time."""
    global _embeddings
    settings = get_settings()
    api_key = settings.GOOGLE_API_KEY
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not set in backend/.env")

    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=api_key,
        )
    return _embeddings


def _get_vectorstore() -> Chroma:
    global _vectorstore
    settings = get_settings()
    if _vectorstore is None:
        _vectorstore = Chroma(
            collection_name="academiq_docs",
            embedding_function=_get_embeddings(),
            persist_directory=settings.CHROMA_PERSIST_DIR,
        )
    return _vectorstore


def reset_embedding_clients() -> None:
    """Drop cached clients so a settings reload picks up a new API key."""
    global _embeddings, _vectorstore
    _embeddings = None
    _vectorstore = None


def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "],
    )
    return splitter.split_text(text)


def embed_and_store(chunks: list[str], document_id: str, user_id: str) -> list[str]:
    metadatas = [
        {"document_id": document_id, "user_id": user_id, "chunk_index": i}
        for i in range(len(chunks))
    ]
    ids = _get_vectorstore().add_texts(texts=chunks, metadatas=metadatas)
    return ids


def _excerpt(text: str, max_len: int = 320) -> str:
    text = " ".join(text.split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def retrieve_relevant_chunks(query: str, document_id: str, k: int = 5) -> list[str]:
    return [c["content"] for c in retrieve_chunk_citations(query, document_id, k=k)]


def retrieve_chunk_citations(
    query: str,
    document_id: str,
    k: int = 5,
) -> list[dict]:
    """Return ranked source chunks with metadata for UI citations."""
    results = _get_vectorstore().similarity_search(
        query=query,
        k=k,
        filter={"document_id": document_id},
    )
    citations: list[dict] = []
    for i, doc in enumerate(results):
        meta = doc.metadata or {}
        chunk_index = meta.get("chunk_index")
        if chunk_index is not None and not isinstance(chunk_index, int):
            try:
                chunk_index = int(chunk_index)
            except (TypeError, ValueError):
                chunk_index = i
        citations.append(
            {
                "index": i + 1,
                "chunk_index": chunk_index if chunk_index is not None else i,
                "excerpt": _excerpt(doc.page_content),
                "content": doc.page_content,
            }
        )
    return citations
