"""P0-T4, P0-T5."""

from __future__ import annotations

import pytest
from app.core.config import Settings
from pydantic import ValidationError

SECRET = "test-secret-key-must-be-at-least-32b"


def test_secret_key_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)  # type: ignore[call-arg]


def test_secret_key_too_short(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", "short")
    with pytest.raises(ValidationError) as exc:
        Settings(_env_file=None)  # type: ignore[call-arg]
    assert "32 bytes" in str(exc.value)


def test_boots_with_empty_mail_password(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", SECRET)
    monkeypatch.setenv("MAIL_PASSWORD", "")
    monkeypatch.setenv("MAIL_USERNAME", "")
    s = Settings(_env_file=None)  # type: ignore[call-arg]
    assert s.mail_password == ""
    assert s.mail_configured is False


def test_prod_refuses_sqlite(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", SECRET)
    monkeypatch.setenv("ENVIRONMENT", "prod")
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./data/x.db")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)  # type: ignore[call-arg]


def test_jwt_issuer_defaults_to_public_domain(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", SECRET)
    monkeypatch.setenv("PUBLIC_DOMAIN", "deals.example.com")
    monkeypatch.setenv("JWT_ISSUER", "")
    s = Settings(_env_file=None)  # type: ignore[call-arg]
    assert s.jwt_issuer == "deals.example.com"
