"""Normalize folder names and tags for documents."""

MAX_FOLDER_LEN = 80
MAX_TAG_LEN = 50
MAX_TAGS = 20


def normalize_folder(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()[:MAX_FOLDER_LEN]
    return cleaned or None


def normalize_tags(raw: list[str] | None) -> list[str]:
    if not raw:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        tag = item.strip()[:MAX_TAG_LEN]
        if not tag:
            continue
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(tag)
        if len(out) >= MAX_TAGS:
            break
    return out


def parse_tags_form(value: str | None) -> list[str]:
    if not value:
        return []
    parts = [p.strip() for p in value.replace(";", ",").split(",")]
    return normalize_tags(parts)
