from langdetect import detect

LANGUAGE_NAMES = {
    "en": "English",
    "bn": "Bengali (বাংলা)",
}

VALID_LANGUAGE_OVERRIDES = frozenset({"auto", "en", "bn"})


def detect_language(text: str) -> str:
    """Returns 'bn' for Bengali, 'en' for English, defaults to 'en'."""
    try:
        lang = detect(text)
        return "bn" if lang == "bn" else "en"
    except Exception:
        return "en"


def resolve_language(
    text: str,
    language_override: str | None,
) -> tuple[str, bool]:
    """
    Resolve output language from document override and optional message text.
    Returns (lang_code, was_auto_detected).
    """
    override = (language_override or "auto").lower()
    if override not in VALID_LANGUAGE_OVERRIDES:
        override = "auto"

    if override in ("en", "bn"):
        return override, False

    return detect_language(text), True


def language_label(lang_code: str) -> str:
    return LANGUAGE_NAMES.get(lang_code, LANGUAGE_NAMES["en"])
