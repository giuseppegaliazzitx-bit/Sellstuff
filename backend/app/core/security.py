"""JWT encode/decode. Algorithm pinned to HS256. `typ` is a required claim.

Every later phase imports this module. No HTTP lives here.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt
from uuid_utils import uuid7

from app.core.config import Settings

JWT_ALGORITHMS = ["HS256"]
REQUIRED_CLAIMS = ["exp", "iat", "sub", "jti", "typ"]


class TokenError(Exception):
    """Token is expired, stale, or invalid. Map to 401 at the edge."""

    def __init__(self, code: str, message: str = "") -> None:
        self.code = code
        super().__init__(message or code)


def new_jti() -> str:
    return str(uuid7())


def encode_jwt(
    settings: Settings,
    *,
    sub: str | UUID,
    typ: str,
    ttl: timedelta,
    extra: dict[str, Any] | None = None,
) -> str:
    """Sign a JWT with the *current* SECRET_KEY. SECRET_KEY_PREVIOUS never signs."""
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(sub),
        "typ": typ,
        "jti": new_jti(),
        "iat": now,
        "exp": now + ttl,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    if extra:
        payload.update(extra)
        payload["typ"] = typ
        payload["sub"] = str(sub)
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_jwt(
    settings: Settings,
    token: str,
    *,
    expected_typ: str,
) -> dict[str, Any]:
    """Verify signature (current key, then previous), then pin `typ`.

    `algorithms=["HS256"]` makes `alg=none` impossible.
    """
    keys = [settings.secret_key]
    if settings.secret_key_previous:
        keys.append(settings.secret_key_previous)

    last_error: Exception | None = None
    claims: dict[str, Any] | None = None
    for key in keys:
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=JWT_ALGORITHMS,
                audience=settings.jwt_audience,
                issuer=settings.jwt_issuer,
                leeway=30,
                options={"require": REQUIRED_CLAIMS},
            )
            break
        except jwt.ExpiredSignatureError as exc:
            raise TokenError("token_expired", "token expired") from exc
        except jwt.InvalidTokenError as exc:
            last_error = exc
            continue

    if claims is None:
        raise TokenError("token_invalid", "token invalid") from last_error

    if claims.get("typ") != expected_typ:
        raise TokenError("token_invalid", "token typ mismatch")

    return claims
