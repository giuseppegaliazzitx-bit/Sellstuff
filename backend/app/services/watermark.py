from __future__ import annotations

import io


def stamp_pdf(data: bytes, label: str) -> bytes:
    """Stamp buyer identity on each page. Falls back to original PDF if pypdf is missing."""
    try:
        from pypdf import PdfReader, PdfWriter
        from pypdf.generic import AnnotationBuilder
    except ImportError:
        return data
    try:
        reader = PdfReader(io.BytesIO(data))
        writer = PdfWriter()
        writer.append_pages_from_reader(reader)
        for i, page in enumerate(writer.pages):
            box = page.mediabox
            width = float(box.width)
            annotation = AnnotationBuilder.free_text(
                f"Confidential — {label}",
                rect=(36, 8, min(width - 36, 420), 28),
                font="Helv",
                font_size="9pt",
                font_color="888888",
                border_color=None,
                background_color=None,
            )
            writer.add_annotation(page_number=i, annotation=annotation)
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()
    except Exception:
        return data
