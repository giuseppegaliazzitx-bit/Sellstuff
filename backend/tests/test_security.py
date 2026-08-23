"""P0-T14 — JWT skeleton."""

from __future__ import annotations

from datetime import timedelta

import jwt
import pytest
from app.core.config import Settings
from app.core.security import TokenError, decode_jwt, encode_jwt

SECRET = "test-secret-key-must-be-at-least-32b"
OTHER = "other-secret-key-must-be-32-bytes-x"


@pytest.fixture
def s(monkeypatch: pytest.MonkeyPatch) -> Settings:
    monkeypatch.setenv("SECRET_KEY", SECRET)
    monkeypatch.setenv("JWT_ISSUER", "localhost")
    monkeypatch.setenv("PUBLIC_DOMAIN", "localhost")
    return Settings(_env_file=None)  # type: ignore[call-arg]


def test_round_trip(s: Settings) -> None:
    token = encode_jwt(s, sub="user-1", typ="access", ttl=timedelta(minutes=15))
    claims = decode_jwt(s, token, expected_typ="access")
    assert claims["sub"] == "user-1"
    assert claims["typ"] == "access"
    assert claims["iss"] == "localhost"
    assert claims["aud"] == "northstar"
    assert "jti" in claims


def test_wrong_typ_rejected(s: Settings) -> None:
    token = encode_jwt(s, sub="user-1", typ="reset", ttl=timedelta(minutes=30))
    with pytest.raises(TokenError) as exc:
        decode_jwt(s, token, expected_typ="access")
    assert exc.value.code == "token_invalid"


def test_wrong_key_rejected(s: Settings) -> None:
    other = s.model_copy(update={"secret_key": OTHER, "secret_key_previous": ""})
    token = encode_jwt(other, sub="user-1", typ="access", ttl=timedelta(minutes=15))
    with pytest.raises(TokenError) as exc:
        decode_jwt(s, token, expected_typ="access")
    assert exc.value.code == "token_invalid"


def test_alg_none_rejected(s: Settings) -> None:
    payload = {
        "sub": "user-1",
        "typ": "access",
        "jti": "jti-1",
        "iss": s.jwt_issuer,
        "aud": s.jwt_audience,
        "iat": 1_787_000_000,
        "exp": 1_787_090_000,
    }
    token = jwt.encode(payload, key=None, algorithm="none")
    with pytest.raises(TokenError):
        decode_jwt(s, token, expected_typ="access")


def test_previous_key_verifies_but_does_not_sign(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", OTHER)
    monkeypatch.setenv("SECRET_KEY_PREVIOUS", SECRET)
    monkeypatch.setenv("JWT_ISSUER", "localhost")
    rotated = Settings(_env_file=None)  # type: ignore[call-arg]
    old = rotated.model_copy(update={"secret_key": SECRET, "secret_key_previous": ""})
    old_token = encode_jwt(old, sub="user-1", typ="access", ttl=timedelta(minutes=15))
    claims = decode_jwt(rotated, old_token, expected_typ="access")
    assert claims["sub"] == "user-1"
    new_token = encode_jwt(rotated, sub="user-1", typ="access", ttl=timedelta(minutes=15))
    header = jwt.get_unverified_header(new_token)
    assert header["alg"] == "HS256"
    # New tokens are not valid under the previous key alone.
    prev_only = rotated.model_copy(update={"secret_key": SECRET, "secret_key_previous": ""})
    with pytest.raises(TokenError):
        decode_jwt(prev_only, new_token, expected_typ="access")


def test_blanking_previous_rejects_old_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", OTHER)
    monkeypatch.setenv("SECRET_KEY_PREVIOUS", SECRET)
    monkeypatch.setenv("JWT_ISSUER", "localhost")
    rotated = Settings(_env_file=None)  # type: ignore[call-arg]
    old = rotated.model_copy(update={"secret_key": SECRET, "secret_key_previous": ""})
    old_token = encode_jwt(old, sub="user-1", typ="access", ttl=timedelta(minutes=15))
    decode_jwt(rotated, old_token, expected_typ="access")
    blanked = rotated.model_copy(update={"secret_key_previous": ""})
    with pytest.raises(TokenError) as exc:
        decode_jwt(blanked, old_token, expected_typ="access")
    assert exc.value.code == "token_invalid"
