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
