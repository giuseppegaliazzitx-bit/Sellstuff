from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.deps import enforce_csrf, get_db, get_kv, get_settings_dep, require_admin
from app.core.kv import KV
from app.models import User
from app.schemas.auth import ApproveIn, BuyerOut, BuyerPatch, RejectIn
from app.services.auth import email_verification_required
from app.services.users import approve_user, get_client, list_buyers, phone_digits, reject_user, suspend_user

router = APIRouter(prefix="/admin/buyers", tags=["admin"])


def _to_out(user: User, *, duplicate_hint: str | None = None) -> BuyerOut:
    profile = user.profile
    return BuyerOut(
        id=user.id,
        email=user.email,
        name=user.name,
        status=user.status,
        role=user.role,
        email_verified=user.email_verified_at is not None,
        company=profile.company if profile else None,
        lead_source=profile.lead_source if profile else None,
        created_at=user.created_at,
        phone=user.phone_raw,
        tier=profile.tier if profile else "C",
        tags=list(profile.tags or []) if profile else [],
        do_not_contact=bool(profile.do_not_contact) if profile else False,
        funds_verified=bool(profile.funds_verified) if profile else False,
        duplicate_hint=duplicate_hint,
    )


@router.get("", response_model=list[BuyerOut])
async def buyers(
    status: str | None = Query(default=None),
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[BuyerOut]:
    rows = await list_buyers(session, status)
    everyone = await list_buyers(session, None) if status else rows
    by_phone: dict[str, list[User]] = {}
    for u in everyone:
        digits = phone_digits(u.phone_raw)
        if digits:
            by_phone.setdefault(digits, []).append(u)
    out = []
    for u in rows:
        hint = None
        digits = phone_digits(u.phone_raw)
        peers = [p for p in by_phone.get(digits, []) if p.id != u.id]
        if peers:
            other = peers[0]
            hint = f"possible duplicate of {other.email}"
        out.append(_to_out(u, duplicate_hint=hint))
    return out


@router.post("/{user_id}/approve", response_model=BuyerOut)
async def approve(
    user_id: str,
    request: Request,
    payload: ApproveIn | None = None,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    kv: KV = Depends(get_kv),
    settings: Settings = Depends(get_settings_dep),
) -> BuyerOut:
    enforce_csrf(request)
    target = await get_client(session, user_id)
    updated = await approve_user(
        session,
        kv,
        admin=admin,
        user=target,
        require_verified=email_verification_required(settings),
    )
    return _to_out(updated)


@router.post("/{user_id}/reject", response_model=BuyerOut)
async def reject(
    user_id: str,
    request: Request,
    payload: RejectIn | None = None,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    kv: KV = Depends(get_kv),
) -> BuyerOut:
    enforce_csrf(request)
    target = await get_client(session, user_id)
    updated = await reject_user(session, kv, user=target)
    return _to_out(updated)


@router.post("/{user_id}/suspend", response_model=BuyerOut)
async def suspend(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    kv: KV = Depends(get_kv),
) -> BuyerOut:
    enforce_csrf(request)
    target = await get_client(session, user_id)
    updated = await suspend_user(session, kv, user=target)
    return _to_out(updated)


@router.get("/{user_id}", response_model=BuyerOut)
async def buyer_detail(
    user_id: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> BuyerOut:
    return _to_out(await get_client(session, user_id))


@router.patch("/{user_id}", response_model=BuyerOut)
async def buyer_patch(
    user_id: str,
    payload: BuyerPatch,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> BuyerOut:
    user = await get_client(session, user_id)
    data = payload.model_dump(exclude_unset=True)
    if user.profile:
        if "tier" in data and data["tier"]:
            user.profile.tier = data["tier"]
        if "tags" in data and data["tags"] is not None:
            user.profile.tags = data["tags"]
        if "do_not_contact" in data and data["do_not_contact"] is not None:
            user.profile.do_not_contact = data["do_not_contact"]
        if "company" in data and data["company"] is not None:
            user.profile.company = data["company"]
        if "funds_verified" in data and data["funds_verified"] is not None:
            user.profile.funds_verified = data["funds_verified"]
    await session.commit()
    return _to_out(await get_client(session, user_id))
