from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from app.core.config import Settings, get_settings, reset_settings_cache
from app.main import create_app
from httpx import ASGITransport, AsyncClient

SECRET = "test-secret-key-must-be-at-least-32b"


@pytest.fixture(autouse=True)
def _isolate_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    db = tmp_path / "test.db"
    monkeypatch.setenv("SECRET_KEY", SECRET)
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db.as_posix()}")
    monkeypatch.setenv("REDIS_URL", "")
    monkeypatch.setenv("MAIL_PASSWORD", "")
    monkeypatch.setenv("ENVIRONMENT", "local")
    monkeypatch.setenv("PUBLIC_BRAND_NAME", "Northstar Dispo")
    monkeypatch.delenv("SECRET_KEY_PREVIOUS", raising=False)
    reset_settings_cache()
    yield
    reset_settings_cache()


@pytest.fixture
def settings() -> Settings:
    return get_settings()


@pytest.fixture
async def client(settings: Settings) -> AsyncIterator[AsyncClient]:
    app = create_app(settings)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
