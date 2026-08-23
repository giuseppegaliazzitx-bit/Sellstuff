from __future__ import annotations

import io
from pathlib import Path

from app.core.errors import AppError
from app.integrations.storage import LocalStorage

PNG_MAGIC = b"\x89PNG"
PDF_MAGIC = b"%PDF"
PHP_MARKERS = (b"<?php", b"<?=", b"<script")


def sniff_image(data: bytes) -> str:
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:4] == PNG_MAGIC:
        return "image/png"
    raise AppError(422, "unsupported_media", "Only JPEG and PNG photos are allowed")


def sniff_pdf(data: bytes) -> str:
    if data[:4] == PDF_MAGIC:
        return "application/pdf"
    raise AppError(422, "unsupported_media", "Only PDF documents are allowed")


def reject_polyglot(data: bytes) -> None:
    head = data[:256].lower()
    for marker in PHP_MARKERS:
        if marker in head:
            raise AppError(422, "unsupported_media", "File content does not match an image")


def process_photo(storage: LocalStorage, deal_id: str, photo_id: str, data: bytes) -> dict[str, str]:
    reject_polyglot(data)
    ctype = sniff_image(data)
    try:
        from PIL import Image
    except ImportError:
        key = f"photos/{deal_id}/{photo_id}.bin"
        storage.put(key, data)
        return {"full": key, "card": key, "thumb": key, "content_type": ctype}

    img = Image.open(io.BytesIO(data))
    img = img.convert("RGB")
    # EXIF is dropped by not copying it into the new file.
    variants = {}
    for name, size in (("thumb", (160, 120)), ("card", (640, 480)), ("full", (1600, 1200))):
        clone = img.copy()
        clone.thumbnail(size)
        buf = io.BytesIO()
        clone.save(buf, format="JPEG", quality=82, optimize=True)
        key = f"photos/{deal_id}/{photo_id}_{name}.jpg"
        storage.put(key, buf.getvalue())
        variants[name] = key
    return {**variants, "content_type": "image/jpeg"}


def store_pdf(storage: LocalStorage, deal_id: str, doc_id: str, data: bytes) -> str:
    sniff_pdf(data)
    key = f"docs/{deal_id}/{doc_id}.pdf"
    storage.put(key, data)
    return key


def media_path(storage: LocalStorage, key: str) -> Path:
    path = (storage.root / key).resolve()
    if not str(path).startswith(str(storage.root.resolve())):
        raise AppError(400, "bad_key", "Invalid media key")
    if not path.exists():
        raise AppError(404, "not_found", "Media not found")
    return path
