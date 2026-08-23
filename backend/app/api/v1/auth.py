from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.cookies import clear_auth_cookies, set_auth_cookies, set_csrf_cookie
from app.core.deps import (
    client_ip,
    enforce_csrf,
    get_current_user,
    get_db,
    get_kv,
    get_limiter,
    get_settings_dep,
    require_user,
)
from app.core.errors import AppError
from app.core.kv import KV, MemoryLimiter
from app.core.security import new_jti
from app.models import User
from app.schemas.auth import (
    AcceptTermsIn,
    ForgotIn,
    LoginIn,
    RegisterIn,
    ResetIn,
    SessionOut,
    UserOut,
    VerifyEmailIn,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _ua(request: Request) -> str:
    return request.headers.get("user-agent", "")


@router.post("/register", response_model=UserOut)
async def register(
    payload: RegisterIn,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    kv: KV = Depends(get_kv),
    limiter: MemoryLimiter = Depends(get_limiter),
) -> UserOut:
    user, verify_token = await auth_service.register_user(
        session,
        settings,
        kv,
        limiter,
        payload,
        ip=client_ip(request),
        user_agent=_ua(request),
    )
    if verify_token:
        request.app.state.mail_outbox.append(
            {"to": user.email, "typ": "verify_email", "token": verify_token}
        )
    user = await auth_service.load_user(session, user.id)
    assert user is not None
    return auth_service.user_out(user, settings)


@router.post("/login", response_model=UserOut)
async def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    limiter: MemoryLimiter = Depends(get_limiter),
) -> UserOut:
    user, access, refresh, csrf = await auth_service.login_user(
        session,
        settings,
        limiter,
        email=str(payload.email),
        password=payload.password,
        ip=client_ip(request),
        user_agent=_ua(request),
    )
    set_auth_cookies(response, settings, access=access, refresh=refresh, csrf=csrf)
    return auth_service.user_out(user, settings)


@router.post("/refresh", response_model=UserOut)
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    kv: KV = Depends(get_kv),
) -> UserOut:
    names = auth_service.cookie_name_map(settings)
    raw = request.cookies.get(names["refresh"], "")
    if not raw:
        raise AppError(401, "token_invalid", "Missing refresh token")
    user, access, new_refresh, csrf = await auth_service.rotate_refresh(
        session,
        settings,
        kv,
        raw,
        ip=client_ip(request),
        user_agent=_ua(request),
    )
    set_auth_cookies(response, settings, access=access, refresh=new_refresh, csrf=csrf)
    return auth_service.user_out(user, settings)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    kv: KV = Depends(get_kv),
    pair: tuple[User, dict] = Depends(get_current_user),
) -> dict[str, str]:
    enforce_csrf(request)
    _user, claims = pair
    exp = int(claims.get("exp", 0))
    remaining = max(0, exp - int(datetime.now(UTC).timestamp()))
    await auth_service.logout(
        session,
        kv,
        family_id=str(claims.get("sid", "")),
        access_jti=str(claims.get("jti", new_jti())),
        access_ttl_remaining=remaining,
    )
    clear_auth_cookies(response, settings)
    return {"ok": "true"}


@router.get("/me", response_model=UserOut)
async def me(
    user: User = Depends(require_user),
    settings: Settings = Depends(get_settings_dep),
) -> UserOut:
    return auth_service.user_out(user, settings)


@router.post("/forgot")
async def forgot(
    payload: ForgotIn,
    request: Request,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    kv: KV = Depends(get_kv),
) -> dict[str, bool]:
    token = await auth_service.issue_reset_token(session, settings, kv, str(payload.email))
    if token:
        request.app.state.mail_outbox.append(
            {"to": str(payload.email).lower(), "typ": "reset", "token": token}
        )
    return {"ok": True}


@router.post("/reset")
async def reset(
    payload: ResetIn,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    kv: KV = Depends(get_kv),
) -> dict[str, bool]:
    await auth_service.consume_reset(session, settings, kv, payload.token, payload.password)
    return {"ok": True}


@router.post("/verify-email", response_model=UserOut)
async def verify_email(
    payload: VerifyEmailIn,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    kv: KV = Depends(get_kv),
) -> UserOut:
    user = await auth_service.consume_verify_email(session, settings, kv, payload.token)
    return auth_service.user_out(user, settings)


@router.get("/sessions", response_model=list[SessionOut])
async def sessions(
    pair: tuple[User, dict] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    user, claims = pair
    rows = await auth_service.list_sessions(session, user.id, str(claims.get("sid", "")))
    current_sid = str(claims.get("sid", ""))
    return [
        SessionOut(
            id=row.id,
            family_id=row.family_id,
            ip=row.ip,
            user_agent=row.user_agent,
            device_label=row.device_label,
            issued_at=row.issued_at,
            last_used_at=row.used_at,
            current=row.family_id == current_sid,
        )
        for row in rows
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    request: Request,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    enforce_csrf(request)
    await auth_service.revoke_session(session, user.id, session_id)
    return {"ok": True}


@router.post("/accept-terms", response_model=UserOut)
async def accept_terms(
    payload: AcceptTermsIn,
    request: Request,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> UserOut:
    enforce_csrf(request)
    await auth_service.accept_terms(
        session,
        settings,
        user,
        payload.terms_version,
        ip=client_ip(request),
        user_agent=_ua(request),
    )
    reloaded = await auth_service.load_user(session, user.id)
    assert reloaded is not None
    return auth_service.user_out(reloaded, settings)


@router.get("/csrf")
async def csrf_bootstrap(request: Request, response: Response) -> dict[str, bool]:
    settings: Settings = request.app.state.settings
    from secrets import token_urlsafe

    set_csrf_cookie(response, settings, token_urlsafe(32))
    return {"ok": True}
