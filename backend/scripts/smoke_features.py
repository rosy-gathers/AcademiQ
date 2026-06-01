"""Quick smoke tests for AcademiQ API features."""
import asyncio
import json
import sys
import urllib.error
import urllib.request
from uuid import UUID

BASE = "http://localhost:8000"
USER = "0ba1bb0c-6305-4ea4-811c-7ed01a8a2033"


def req(method: str, path: str, body: dict | None = None, timeout: int = 120):
    url = BASE + path
    data = None
    headers: dict[str, str] = {}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            raw = resp.read().decode()
            payload = json.loads(raw) if raw else {}
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"raw": raw[:300]}
        return exc.code, payload


async def test_websocket(doc_id: str) -> tuple[bool, str]:
    try:
        import websockets
    except ImportError:
        return False, "websockets package not installed"

    uri = f"ws://localhost:8000/api/chat/{doc_id}"
    try:
        async with websockets.connect(uri) as ws:
            await ws.send(
                json.dumps(
                    {
                        "message": "Summarize this lecture in one sentence.",
                        "user_id": USER,
                    }
                )
            )
            for _ in range(40):
                msg = await asyncio.wait_for(ws.recv(), timeout=25)
                if msg.startswith("{"):
                    data = json.loads(msg)
                    if data.get("type") == "done":
                        return True, "stream completed"
            return False, "no done message"
    except Exception as exc:
        return False, str(exc)[:120]


def main() -> int:
    failures: list[str] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        status = "PASS" if ok else "FAIL"
        print(f"{status}\t{name}" + (f"\t{detail}" if detail and not ok else ""))
        if not ok:
            failures.append(name)

    s, docs_payload = req("GET", f"/api/documents/user/{USER}")
    check("List documents", s == 200)
    documents = docs_payload.get("documents", [])
    if not documents:
        print("No documents — skipping document-scoped tests")
        return 1

    doc_id = documents[0]["id"]

    # Flashcard review + delete
    s, fc_payload = req("GET", f"/api/flashcards/user/{USER}")
    cards = fc_payload.get("cards", [])
    if cards:
        cid = cards[0]["id"]
        s, _ = req("POST", f"/api/flashcards/{cid}/review", {"rating": "good"})
        check("Review flashcard (SM-2)", s == 200)
        s = req("DELETE", f"/api/flashcards/{cid}")[0]
        check("Delete flashcard", s == 204)
    else:
        check("Review flashcard (SM-2)", False, "no cards")
        check("Delete flashcard", False, "no cards")

    audio_docs = [d for d in documents if d.get("source_type") == "audio"]
    if audio_docs:
        s, _ = req("GET", f"/api/audio/transcript/{audio_docs[0]['id']}")
        check("Audio transcript", s == 200)
    else:
        print("SKIP\tAudio transcript (no audio document uploaded)")

    ok, detail = asyncio.run(test_websocket(doc_id))
    check("WebSocket chat tutor", ok, detail)

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
