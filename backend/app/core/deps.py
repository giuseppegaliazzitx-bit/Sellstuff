from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.cookies import cookie_names, preview_enabled
from app.core.errors import AppError
from app.core.kv import KV, MemoryLimiter
from app.models import User
from app.services.auth import authenticate_access

bearer_scheme = HTTPBearer(auto_error=False)


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings


def get_kv(request: Request) -> KV:
    return request.app.state.kv


def get_limiter(request: Request) -> MemoryLimiter:
    return request.app.state.limiter


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    factory = request.app.state.session_factory
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _extract_access(request: Request, settings: Settings, creds: HTTPAuthorizationCredentials | None) -> str | None:
    if creds and creds.scheme.lower() == "bearer":
        return creds.credentials
    names = cookie_names(settings)
    return request.cookies.get(names["access"])


async def get_current_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> tuple[User, dict[str, Any]]:
    settings: Settings = request.app.state.settings
    token = _extract_access(request, settings, creds)
    if not token:
        raise AppError(401, "token_invalid", "Not authenticated")
    user, claims = await authenticate_access(session, settings, request.app.state.kv, token)
    request.state.auth_claims = claims
    request.state.auth_user = user
    request.state.auth_bearer = bool(creds)
    return user, claims


async def require_user(
    pair: Annotated[tuple[User, dict[str, Any]], Depends(get_current_user)],
) -> User:
    return pair[0]


async def require_active(
    user: Annotated[User, Depends(require_user)],
) -> User:
    if user.status != "active":
        raise AppError(403, "forbidden", "Account is not approved")
    return user


def viewing_as_client(request: Request, user: User) -> bool:
    settings: Settings = request.app.state.settings
    return user.role != "admin" or preview_enabled(request.cookies, settings)


async def require_admin(
    request: Request,
    user: Annotated[User, Depends(require_active)],
) -> User:
    if user.role != "admin":
        raise AppError(403, "forbidden", "Admin only")
    settings: Settings = request.app.state.settings
    path = request.url.path
    enroll_ok = path.startswith("/api/v1/auth/totp") or path in {
        "/api/v1/auth/me",
        "/api/v1/auth/logout",
        "/api/v1/auth/preview-as-client",
    }
    if preview_enabled(request.cookies, settings) and path != "/api/v1/auth/preview-as-client":
        raise AppError(403, "preview_as_client", "Exit client view to use the desk")
    if settings.admin_require_2fa and not user.totp_secret and not enroll_ok:
        raise AppError(403, "totp_enrollment_required", "Enroll two-factor authentication")
    return user


CSRF_EXEMPT = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/forgot",
    "/api/v1/auth/reset",
    "/api/v1/auth/verify-email",
    "/api/v1/auth/refresh",
}


def enforce_csrf(request: Request) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    if request.url.path in CSRF_EXEMPT:
        return
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return
    settings: Settings = request.app.state.settings
    names = cookie_names(settings)
    cookie_token = request.cookies.get(names["csrf"], "")
    header_token = request.headers.get("x-csrf-token", "")
    if not cookie_token or not header_token or cookie_token != header_token:
        raise AppError(403, "csrf_failed", "CSRF check failed")
    origin = request.headers.get("origin") or ""
    if origin and origin not in settings.cors_origin_list:
        raise AppError(403, "csrf_failed", "CSRF origin mismatch")
    # Same-site tests may omit Origin; cookie+header match is enough then.
    referer = request.headers.get("referer") or ""
    if not origin and referer and not any(referer.startswith(o) for o in settings.cors_origin_list):
        raise AppError(403, "csrf_failed", "CSRF origin mismatch")
