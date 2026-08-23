from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime

import pyotp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.core.passwords import verify_password
from app.models import TotpRecoveryCode, User, new_id

RECOVERY_COUNT = 10
_XOR_PREFIX = b"ns-totp|"


def _now() -> datetime:
    return datetime.now(UTC)


def _key(app_secret: str) -> bytes:
    return hashlib.sha256(_XOR_PREFIX + app_secret.encode("utf-8")).digest()


def encrypt_secret(app_secret: str, totp_b32: str) -> str:
    raw = totp_b32.encode("utf-8")
    key = _key(app_secret)
    nonce = secrets.token_bytes(16)
    stream = hashlib.sha256(key + nonce).digest()
    ct = bytes(b ^ stream[i % len(stream)] for i, b in enumerate(raw))
    mac = hmac.new(key, nonce + ct, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(nonce + mac + ct).decode("ascii")


def decrypt_secret(app_secret: str, blob: str) -> str:
    data = base64.urlsafe_b64decode(blob.encode("ascii"))
    nonce, mac, ct = data[:16], data[16:48], data[48:]
    key = _key(app_secret)
    expected = hmac.new(key, nonce + ct, hashlib.sha256).digest()
    if not hmac.compare_digest(mac, expected):
        raise ValueError("totp blob mac mismatch")
    stream = hashlib.sha256(key + nonce).digest()
    raw = bytes(b ^ stream[i % len(stream)] for i, b in enumerate(ct))
    return raw.decode("utf-8")


def _hash_recovery(code: str) -> str:
    return hashlib.sha256(code.strip().lower().encode("utf-8")).hexdigest()


def mint_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str, issuer: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)


def verify_code(secret: str, code: str) -> bool:
    digits = "".join(ch for ch in (code or "") if ch.isdigit())
    if len(digits) != 6:
        return False
    return bool(pyotp.TOTP(secret).verify(digits, valid_window=1))


def mint_recovery_codes() -> list[str]:
    codes = []
    for _ in range(RECOVERY_COUNT):
        chunk = secrets.token_hex(4)
        codes.append(f"{chunk[:4]}-{chunk[4:]}")
    return codes


def assert_password(user: User, password: str) -> None:
    if not verify_password(password, user.password_hash):
        raise AppError(401, "invalid_credentials", "Invalid email or password")


async def begin_enroll(settings: Settings, user: User, password: str) -> dict[str, str]:
    assert_password(user, password)
    secret = mint_secret()
    return {
        "secret": secret,
        "otpauth_url": provisioning_uri(secret, user.email, settings.public_brand_name),
    }


async def confirm_enroll(
    session: AsyncSession,
    settings: Settings,
    user: User,
    *,
    password: str,
    secret: str,
    code: str,
) -> list[str]:
    assert_password(user, password)
    if not verify_code(secret, code):
        raise AppError(401, "totp_invalid", "Invalid authenticator code")
    user.totp_secret = encrypt_secret(settings.secret_key, secret)
    user.totp_enrolled_at = _now()
    existing = (
        (await session.execute(select(TotpRecoveryCode).where(TotpRecoveryCode.user_id == user.id))).scalars().all()
    )
    for row in existing:
        await session.delete(row)
    codes = mint_recovery_codes()
    now = _now()
    for raw in codes:
        session.add(
            TotpRecoveryCode(
                id=new_id(),
                user_id=user.id,
                code_hash=_hash_recovery(raw),
                created_at=now,
            )
        )
    await session.commit()
    return codes


async def disable_totp(
    session: AsyncSession,
    settings: Settings,
    user: User,
    *,
    password: str,
    code: str,
) -> None:
    assert_password(user, password)
    if not user.totp_secret:
        return
    ok = await verify_user_factor(session, settings, user, code)
    if not ok:
        raise AppError(401, "totp_invalid", "Invalid authenticator code")
    user.totp_secret = None
    user.totp_enrolled_at = None
    rows = (await session.execute(select(TotpRecoveryCode).where(TotpRecoveryCode.user_id == user.id))).scalars().all()
    for row in rows:
        await session.delete(row)
    await session.commit()


async def verify_user_factor(
    session: AsyncSession,
    settings: Settings,
    user: User,
    code: str,
) -> bool:
    if not user.totp_secret:
        return False
    secret = decrypt_secret(settings.secret_key, user.totp_secret)
    if verify_code(secret, code):
        return True
    hashed = _hash_recovery(code)
    row = (
        await session.execute(
            select(TotpRecoveryCode).where(
                TotpRecoveryCode.user_id == user.id,
                TotpRecoveryCode.code_hash == hashed,
                TotpRecoveryCode.used_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return False
    row.used_at = _now()
    await session.flush()
    return True
