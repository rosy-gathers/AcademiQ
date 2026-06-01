from app.models import Document


def filter_documents(
    documents: list[Document],
    folder: str | None,
    tag: str | None,
) -> list[Document]:
    result = documents
    if folder:
        needle = folder.strip().lower()
        result = [
            d
            for d in result
            if d.folder and d.folder.strip().lower() == needle
        ]
    if tag:
        needle = tag.strip().lower()
        result = [
            d
            for d in result
            if any(t.strip().lower() == needle for t in (d.tags or []))
        ]
    return result
