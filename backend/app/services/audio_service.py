import os
import tempfile
from pathlib import Path

from app.services.transcript_builder import build_transcript_payload

_model = None
_whisper = None


def _get_whisper():
    global _whisper
    if _whisper is None:
        try:
            import whisper
        except ImportError as exc:
            raise RuntimeError(
                "openai-whisper is not installed. Run: pip install openai-whisper"
            ) from exc
        _whisper = whisper
    return _whisper


def _get_model():
    global _model
    if _model is None:
        whisper = _get_whisper()
        _model = whisper.load_model("base")
    return _model


def transcribe_audio_file_detailed(file_path: str) -> dict:
    """Transcribe with Whisper segments, chapters, and speaker labels."""
    model = _get_model()
    result = model.transcribe(file_path)
    segments_raw = result.get("segments") or []
    if not segments_raw and result.get("text"):
        segments_raw = [{"start": 0.0, "end": 0.0, "text": result["text"]}]
    payload = build_transcript_payload(segments_raw)
    if not payload["text"] and result.get("text"):
        payload["text"] = str(result["text"]).strip()
    return payload


def transcribe_audio_file(file_path: str) -> str:
    return transcribe_audio_file_detailed(file_path)["text"]


def transcribe_audio_bytes_detailed(file_bytes: bytes, suffix: str = ".mp3") -> dict:
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        return transcribe_audio_file_detailed(tmp_path)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def transcribe_audio_bytes(file_bytes: bytes, suffix: str = ".mp3") -> str:
    return transcribe_audio_bytes_detailed(file_bytes, suffix)["text"]


def audio_suffix_from_filename(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac", ".mp4"}:
        return ext
    return ".mp3"


def transcript_preview(text: str, max_length: int = 500) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length].rstrip() + "..."
