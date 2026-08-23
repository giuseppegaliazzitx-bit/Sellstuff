"""Dump OpenAPI JSON and optionally regenerate frontend types."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
OUT = BACKEND / "openapi.json"

sys.path.insert(0, str(BACKEND))
os.environ.setdefault("SECRET_KEY", "test-secret-key-must-be-at-least-32b")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./data/northstar.db")

from app.core.config import get_settings  # noqa: E402
from app.main import create_app  # noqa: E402


def main() -> int:
    app = create_app(get_settings())
    OUT.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
