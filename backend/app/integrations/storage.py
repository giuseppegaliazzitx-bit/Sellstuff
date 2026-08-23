"""Object storage. Filesystem locally; S3/MinIO when S3_ENDPOINT is set."""

from __future__ import annotations

from pathlib import Path

from app.core.config import Settings


class LocalStorage:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def put(self, key: str, data: bytes) -> Path:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path

    def get(self, key: str) -> bytes:
        return (self.root / key).read_bytes()


def build_storage(settings: Settings) -> LocalStorage:
    # S3 client lands when MinIO/Compose is wired. Local-first always has a disk fallback.
    return LocalStorage(Path(settings.local_media_dir))
