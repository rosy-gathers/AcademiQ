"""Build chapter markers, speaker labels, and formatted lecture transcripts."""

from __future__ import annotations

CHAPTER_INTERVAL_SEC = 300  # 5 minutes
SPEAKER_GAP_SEC = 1.8


def _format_timestamp(seconds: float) -> str:
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def _chapter_title_from_text(text: str, fallback: str) -> str:
    words = text.strip().split()
    if not words:
        return fallback
    snippet = " ".join(words[:10])
    if len(snippet) > 60:
        snippet = snippet[:57].rstrip() + "..."
    return snippet


def assign_speakers(segments: list[dict]) -> list[dict]:
    """Alternate speaker labels when gaps suggest turn-taking."""
    if not segments:
        return segments

    current = 1
    last_end = 0.0
    for seg in segments:
        gap = seg["start"] - last_end
        if last_end > 0 and gap >= SPEAKER_GAP_SEC:
            current = 2 if current == 1 else 1
        seg["speaker"] = f"Speaker {current}"
        last_end = seg["end"]
    return segments


def build_chapters(segments: list[dict]) -> list[dict]:
    """Split transcript into time-based chapters with titles."""
    if not segments:
        return []

    chapters: list[dict] = []
    chapter_segments: list[dict] = []
    chapter_start = segments[0]["start"]
    chapter_index = 1

    def flush() -> None:
        nonlocal chapter_index, chapter_segments, chapter_start
        if not chapter_segments:
            return
        first_text = chapter_segments[0].get("text", "")
        chapters.append(
            {
                "id": chapter_index,
                "title": _chapter_title_from_text(
                    first_text,
                    f"Chapter {chapter_index}",
                ),
                "start": chapter_start,
                "end": chapter_segments[-1]["end"],
                "segment_count": len(chapter_segments),
            }
        )
        for seg in chapter_segments:
            seg["chapter_id"] = chapter_index
        chapter_index += 1
        chapter_segments = []

    for seg in segments:
        if chapter_segments and seg["start"] - chapter_start >= CHAPTER_INTERVAL_SEC:
            flush()
            chapter_start = seg["start"]
        chapter_segments.append(seg)

    flush()
    return chapters


def format_transcript_for_index(segments: list[dict], chapters: list[dict]) -> str:
    """Plain text with chapter headers and speaker lines for RAG indexing."""
    if not segments:
        return ""

    lines: list[str] = []
    chapter_map = {c["id"]: c for c in chapters}
    current_chapter_id: int | None = None

    for seg in segments:
        cid = seg.get("chapter_id")
        if cid != current_chapter_id and cid in chapter_map:
            ch = chapter_map[cid]
            lines.append("")
            lines.append(
                f"## {ch['title']} ({_format_timestamp(ch['start'])} - "
                f"{_format_timestamp(ch['end'])})"
            )
            lines.append("")
            current_chapter_id = cid

        ts = _format_timestamp(seg["start"])
        speaker = seg.get("speaker", "Speaker 1")
        lines.append(f"[{speaker}] ({ts}) {seg['text']}")

    return "\n".join(lines).strip()


def build_transcript_payload(segments_raw: list[dict]) -> dict:
    """Full structured transcript from Whisper segments."""
    segments = [
        {
            "start": float(s["start"]),
            "end": float(s["end"]),
            "text": str(s.get("text", "")).strip(),
        }
        for s in segments_raw
        if str(s.get("text", "")).strip()
    ]
    segments = assign_speakers(segments)
    chapters = build_chapters(segments)
    duration = segments[-1]["end"] if segments else 0.0
    speakers = sorted({s.get("speaker", "Speaker 1") for s in segments})
    text = format_transcript_for_index(segments, chapters)

    return {
        "text": text,
        "segments": segments,
        "chapters": chapters,
        "duration_seconds": round(duration, 1),
        "speakers": speakers,
    }
