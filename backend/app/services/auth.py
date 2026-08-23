from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid_utils import uuid7

from app.core.config import Settings
from app.core.cookies import cookie_names
from app.core.errors import AppError
from app.core.kv import KV, MemoryLimiter
from app.core.passwords import PasswordError, hash_password, verify_password
from app.core.security import TokenError, decode_jwt, encode_jwt
from app.models import BuyerProfile, ImportedBuyer, RefreshToken, TermsAcceptance, User, new_id
from app.schemas.auth import RegisterIn, UserOut

LOGIN_LIMIT = 10
LOGIN_WINDOW = 900
REGISTER_LIMIT = 5
REGISTER_WINDOW = 3600

INVALID_CREDENTIALS = AppError(401, "invalid_credentials", "Invalid email or password")


def _now() -> datetime:
    return datetime.now(UTC)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _hash_refresh(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _device_label(user_agent: str) -> str:
    return (user_agent or "")[:80] or "unknown"


def email_verification_required(settings: Settings) -> bool:
    mode = settings.require_email_verification.lower()
    if mode == "true":
        return True
    if mode == "false":
        return False
    return settings.mail_configured


def user_out(user: User, settings: Settings, *, preview_as_client: bool = False) -> UserOut:
    latest = None
    if user.terms:
        latest = max(user.terms, key=lambda row: row.accepted_at)
    accepted = latest is not None and latest.terms_version == settings.terms_version
    enrolled = bool(user.totp_secret)
    needs = bool(settings.admin_require_2fa and user.role == "admin" and not enrolled)
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        status=user.status,
        email_verified=user.email_verified_at is not None,
        terms_accepted=accepted,
        terms_version=latest.terms_version if latest else None,
        totp_enrolled=enrolled,
        totp_required=needs,
        preview_as_client=bool(preview_as_client and user.role == "admin"),
    )


async def bump_ver(session: AsyncSession, kv: KV, user: User) -> None:
    user.token_version += 1
    await kv.setex(f"user:{user.id}:ver", 300, str(user.token_version))


async def cached_ver(kv: KV, user: User) -> int:
    raw = await kv.get(f"user:{user.id}:ver")
    if raw is None:
        await kv.setex(f"user:{user.id}:ver", 300, str(user.token_version))
        return user.token_version
    return int(raw)


def create_session_tokens(
    settings: Settings,
    user: User,
    *,
    family_id: str | None = None,
    parent_id: str | None = None,
    ip: str = "",
    user_agent: str = "",
) -> tuple[str, str, str, RefreshToken]:
    family = family_id or str(uuid7())
    raw_refresh = secrets.token_urlsafe(32)
    now = _now()
    row = RefreshToken(
        id=new_id(),
        user_id=user.id,
        family_id=family,
        token_hash=_hash_refresh(raw_refresh),
        parent_id=parent_id,
        issued_at=now,
        expires_at=now + timedelta(days=settings.refresh_token_ttl_days),
        ip=ip,
        user_agent=user_agent[:500],
        device_label=_device_label(user_agent),
    )
    access = encode_jwt(
        settings,
        sub=user.id,
        typ="access",
        ttl=timedelta(minutes=settings.access_token_ttl_minutes),
        extra={
            "sid": family,
            "role": user.role,
            "status": user.status,
            "ver": user.token_version,
        },
    )
    return access, raw_refresh, secrets.token_urlsafe(32), row


async def register_user(
    session: AsyncSession,
    settings: Settings,
    kv: KV,
    limiter: MemoryLimiter,
    payload: RegisterIn,
    *,
    ip: str,
    user_agent: str,
) -> tuple[User, str | None]:
    if not limiter.allow(f"register:{ip}", REGISTER_LIMIT, REGISTER_WINDOW):
        raise AppError(429, "rate_limited", "Too many registration attempts")
    if payload.terms_version != settings.terms_version:
        raise AppError(422, "terms_version", "Terms version does not match current terms")

    email = str(payload.email).lower()
    existing = (
        await session.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    ).scalar_one_or_none()
    if existing:
        raise AppError(409, "email_taken", "An account with this email already exists")

    try:
        hashed = hash_password(payload.password)
    except PasswordError as exc:
        raise AppError(422, exc.code, str(exc)) from exc

    imported = (
        await session.execute(
            select(ImportedBuyer).where(ImportedBuyer.email == email, ImportedBuyer.claimed_user_id.is_(None))
        )
    ).scalar_one_or_none()
    status = "pending" if settings.require_admin_approval else "active"
    if imported:
        status = "active"
    now = _now()
    user = User(
        id=new_id(),
        email=email,
        password_hash=hashed,
        role="client",
        status=status,
        name=payload.full_name.strip(),
        phone_raw=payload.phone,
        token_version=1,
        created_at=now,
        sms_consent_at=now if payload.sms_consent else None,
        approved_at=now if status == "active" else None,
    )
    session.add(user)
    await session.flush()
    session.add(
        BuyerProfile(
            user_id=user.id,
            company=payload.company or "",
            max_price_cents=payload.max_purchase_price_cents,
            asset_types=list(payload.asset_types),
            markets=list(payload.markets),
            lead_source="import" if imported else payload.lead_source,
            tier=imported.tier if imported else "C",
        )
    )
    if imported:
        imported.claimed_user_id = user.id
    session.add(
        TermsAcceptance(
            id=new_id(),
            user_id=user.id,
            terms_version=payload.terms_version,
            ip=ip,
            user_agent=user_agent[:500],
            accepted_at=now,
        )
    )
    verify_token = None
    if email_verification_required(settings):
        verify_token = encode_jwt(
            settings,
            sub=user.id,
            typ="verify_email",
            ttl=timedelta(hours=24),
            extra={"email": user.email},
        )
        claims = decode_jwt(settings, verify_token, expected_typ="verify_email")
        await kv.setex(f"tok:{claims['jti']}", 24 * 3600, "unused")
    await session.commit()
    await session.refresh(user)
    return user, verify_token


async def login_user(
    session: AsyncSession,
    settings: Settings,
    limiter: MemoryLimiter,
    *,
    email: str,
    password: str,
    ip: str,
    user_agent: str,
    totp_code: str | None = None,
) -> tuple[User, str, str, str]:
    if not limiter.allow(f"login:{ip}", LOGIN_LIMIT, LOGIN_WINDOW):
        raise AppError(429, "rate_limited", "Too many login attempts")
    user = (
        await session.execute(
            select(User)
            .options(selectinload(User.terms), selectinload(User.profile))
            .where(User.email == email.lower(), User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise INVALID_CREDENTIALS
    if user.status in {"suspended", "rejected"}:
        raise AppError(403, "account_disabled", "This account is disabled")
    if user.totp_secret:
        if not totp_code:
            raise AppError(401, "totp_required", "Two-factor code required")
        from app.services.totp import verify_user_factor

        ok = await verify_user_factor(session, settings, user, totp_code)
        if not ok:
            raise AppError(401, "totp_invalid", "Invalid authenticator code")
    user.last_login_at = _now()
    access, refresh, csrf, row = create_session_tokens(settings, user, ip=ip, user_agent=user_agent)
    session.add(row)
    await session.commit()
    return user, access, refresh, csrf


async def rotate_refresh(
    session: AsyncSession,
    settings: Settings,
    kv: KV,
    raw_refresh: str,
    *,
    ip: str,
    user_agent: str,
) -> tuple[User, str, str, str]:
    token_hash = _hash_refresh(raw_refresh)
    row = (
        await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    ).scalar_one_or_none()
    if row is None or row.revoked_at is not None or _aware(row.expires_at) < _now():
        raise AppError(401, "token_invalid", "Invalid refresh token")
    if row.used_at is not None:
        await _revoke_family(session, row.family_id)
        await session.commit()
        raise AppError(401, "token_invalid", "Refresh token reuse detected")

    user = (
        await session.execute(
            select(User)
            .options(selectinload(User.terms), selectinload(User.profile))
            .where(User.id == row.user_id, User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if user is None or user.status in {"suspended", "rejected"}:
        await _revoke_family(session, row.family_id)
        await session.commit()
        raise AppError(401, "token_invalid", "Invalid refresh token")

    row.used_at = _now()
    access, new_raw, csrf, child = create_session_tokens(
        settings,
        user,
        family_id=row.family_id,
        parent_id=row.id,
        ip=ip,
        user_agent=user_agent,
    )
    session.add(child)
    await session.commit()
    return user, access, new_raw, csrf


async def _revoke_family(session: AsyncSession, family_id: str) -> None:
    now = _now()
    rows = (await session.execute(select(RefreshToken).where(RefreshToken.family_id == family_id))).scalars().all()
    for row in rows:
        if row.revoked_at is None:
            row.revoked_at = now


async def logout(
    session: AsyncSession,
    kv: KV,
    *,
    family_id: str,
    access_jti: str,
    access_ttl_remaining: int,
) -> None:
    await _revoke_family(session, family_id)
    if access_ttl_remaining > 0:
        await kv.setex(f"jti:{access_jti}", access_ttl_remaining, "1")
    await session.commit()


async def load_user(session: AsyncSession, user_id: str) -> User | None:
    return (
        await session.execute(
            select(User)
            .options(selectinload(User.terms), selectinload(User.profile))
            .where(User.id == user_id, User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()


async def authenticate_access(
    session: AsyncSession,
    settings: Settings,
    kv: KV,
    token: str,
) -> tuple[User, dict[str, Any]]:
    try:
        claims = decode_jwt(settings, token, expected_typ="access")
    except TokenError as exc:
        raise AppError(401, exc.code, str(exc)) from exc
    if await kv.get(f"jti:{claims['jti']}"):
        raise AppError(401, "token_invalid", "Token revoked")
    user = await load_user(session, str(claims["sub"]))
    if user is None:
        raise AppError(401, "token_invalid", "Token invalid")
    ver = await cached_ver(kv, user)
    if int(claims.get("ver", -1)) != ver:
        raise AppError(401, "token_stale", "Token stale")
    return user, claims


async def issue_reset_token(session: AsyncSession, settings: Settings, kv: KV, email: str) -> str | None:
    user = (
        await session.execute(select(User).where(User.email == email.lower(), User.deleted_at.is_(None)))
    ).scalar_one_or_none()
    if user is None:
        return None
    token = encode_jwt(
        settings,
        sub=user.id,
        typ="reset",
        ttl=timedelta(minutes=30),
        extra={"ver": user.token_version, "email": user.email},
    )
    claims = decode_jwt(settings, token, expected_typ="reset")
    await kv.setex(f"tok:{claims['jti']}", 30 * 60, "unused")
    return token


async def consume_reset(
    session: AsyncSession,
    settings: Settings,
    kv: KV,
    token: str,
    new_password: str,
) -> None:
    try:
        claims = decode_jwt(settings, token, expected_typ="reset")
    except TokenError as exc:
        raise AppError(401, exc.code, "Invalid reset token") from exc
    state = await kv.get(f"tok:{claims['jti']}")
    if state != "unused":
        raise AppError(401, "token_invalid", "Reset token already used")
    user = await load_user(session, str(claims["sub"]))
    if user is None:
        raise AppError(401, "token_invalid", "Invalid reset token")
    if int(claims.get("ver", -1)) != user.token_version:
        raise AppError(401, "token_invalid", "Reset token already used")
    try:
        user.password_hash = hash_password(new_password)
    except PasswordError as exc:
        raise AppError(422, exc.code, str(exc)) from exc
    await kv.setex(f"tok:{claims['jti']}", 30 * 60, "used")
    await bump_ver(session, kv, user)
    families = (await session.execute(select(RefreshToken).where(RefreshToken.user_id == user.id))).scalars().all()
    now = _now()
    for row in families:
        if row.revoked_at is None:
            row.revoked_at = now
    await session.commit()


async def consume_verify_email(
    session: AsyncSession,
    settings: Settings,
    kv: KV,
    token: str,
) -> User:
    try:
        claims = decode_jwt(settings, token, expected_typ="verify_email")
    except TokenError as exc:
        raise AppError(401, exc.code, "Invalid verification token") from exc
    state = await kv.get(f"tok:{claims['jti']}")
    if state != "unused":
        raise AppError(401, "token_invalid", "Verification token already used")
    user = await load_user(session, str(claims["sub"]))
    if user is None:
        raise AppError(401, "token_invalid", "Invalid verification token")
    user.email_verified_at = _now()
    await kv.setex(f"tok:{claims['jti']}", 24 * 3600, "used")
    await session.commit()
    return user


async def list_sessions(session: AsyncSession, user_id: str, _current_sid: str) -> list[RefreshToken]:
    stmt = (
        select(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.used_at.is_(None),
        )
        .order_by(RefreshToken.issued_at.desc())
    )
    return list((await session.execute(stmt)).scalars().all())


async def revoke_session(session: AsyncSession, user_id: str, token_id: str) -> None:
    row = (
        await session.execute(select(RefreshToken).where(RefreshToken.id == token_id, RefreshToken.user_id == user_id))
    ).scalar_one_or_none()
    if row is None:
        raise AppError(404, "not_found", "Session not found")
    await _revoke_family(session, row.family_id)
    await session.commit()


async def revoke_all_sessions(session: AsyncSession, user_id: str, *, keep_family: str | None = None) -> None:
    rows = (await session.execute(select(RefreshToken).where(RefreshToken.user_id == user_id))).scalars().all()
    now = _now()
    for row in rows:
        if keep_family and row.family_id == keep_family:
            continue
        if row.revoked_at is None:
            row.revoked_at = now
    await session.commit()


async def change_password(
    session: AsyncSession,
    kv: KV,
    user: User,
    *,
    current_password: str,
    new_password: str,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise INVALID_CREDENTIALS
    try:
        user.password_hash = hash_password(new_password)
    except PasswordError as exc:
        raise AppError(422, exc.code, str(exc)) from exc
    await bump_ver(session, kv, user)
    rows = (await session.execute(select(RefreshToken).where(RefreshToken.user_id == user.id))).scalars().all()
    now = _now()
    for row in rows:
        if row.revoked_at is None:
            row.revoked_at = now
    await session.commit()


async def accept_terms(
    session: AsyncSession,
    settings: Settings,
    user: User,
    version: str,
    *,
    ip: str,
    user_agent: str,
) -> None:
    if version != settings.terms_version:
        raise AppError(422, "terms_version", "Terms version does not match current terms")
    session.add(
        TermsAcceptance(
            id=new_id(),
            user_id=user.id,
            terms_version=version,
            ip=ip,
            user_agent=user_agent[:500],
            accepted_at=_now(),
        )
    )
    await session.commit()


def cookie_name_map(settings: Settings) -> dict[str, str]:
    return cookie_names(settings)
