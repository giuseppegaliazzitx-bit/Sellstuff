from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, require_admin
from app.core.errors import AppError
from app.integrations.storage import build_storage
from app.models import Market, MarketManager, User, new_id
from app.schemas.deals import ManagerOut
from app.services.deals import manager_out, market_out
from app.services.media import process_photo

router = APIRouter(tags=["admin-managers"])


def _now() -> datetime:
    return datetime.now(UTC)


async def _load(session: AsyncSession, manager_id: str) -> MarketManager:
    row = (
        await session.execute(
            select(MarketManager).options(selectinload(MarketManager.markets)).where(MarketManager.id == manager_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise AppError(404, "not_found", "Manager not found")
    return row


async def _market_ids(session: AsyncSession, manager_id: str) -> list[str]:
    return list(
        (await session.execute(select(Market.id).where(Market.manager_id == manager_id))).scalars().all()
    )


def _out(row: MarketManager, market_ids: list[str]) -> ManagerOut:
    return manager_out(row, market_ids=market_ids)


@router.get("/admin/managers", response_model=list[ManagerOut])
async def list_managers(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[ManagerOut]:
    rows = (
        (await session.execute(select(MarketManager).options(selectinload(MarketManager.markets)))).scalars().all()
    )
    return [_out(r, await _market_ids(session, r.id)) for r in rows]


@router.post("/admin/managers", response_model=ManagerOut)
async def create_manager(
    payload: dict,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> ManagerOut:
    name = str(payload.get("name") or "").strip()
    if not name:
        raise AppError(422, "name_required", "Name is required")
    row = MarketManager(
        id=new_id(),
        name=name,
        phone=str(payload.get("phone") or ""),
        email=str(payload.get("email") or ""),
        license=str(payload.get("license") or ""),
        created_at=_now(),
    )
    session.add(row)
    await session.flush()
    ids = payload.get("market_ids") or []
    if ids:
        markets = (await session.execute(select(Market).where(Market.id.in_(ids)))).scalars().all()
        for m in markets:
            m.manager_id = row.id
    await session.commit()
    loaded = await _load(session, row.id)
    return _out(loaded, await _market_ids(session, loaded.id))


@router.patch("/admin/managers/{manager_id}", response_model=ManagerOut)
async def patch_manager(
    manager_id: str,
    payload: dict,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> ManagerOut:
    row = await _load(session, manager_id)
    if "name" in payload and str(payload["name"]).strip():
        row.name = str(payload["name"]).strip()
    if "phone" in payload:
        row.phone = str(payload["phone"] or "")
    if "email" in payload:
        row.email = str(payload["email"] or "")
    if "license" in payload:
        row.license = str(payload["license"] or "")
    if "market_ids" in payload:
        raw_ids = payload.get("market_ids")
        wanted = {str(x) for x in (raw_ids or [])}
        all_markets = (await session.execute(select(Market))).scalars().all()
        for m in all_markets:
            if m.id in wanted:
                m.manager_id = row.id
            elif m.manager_id == row.id:
                m.manager_id = None
        await session.flush()
    await session.commit()
    session.expire_all()
    loaded = await _load(session, manager_id)
    return _out(loaded, await _market_ids(session, manager_id))


@router.delete("/admin/managers/{manager_id}")
async def delete_manager(
    manager_id: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    row = await _load(session, manager_id)
    markets = (await session.execute(select(Market).where(Market.manager_id == row.id))).scalars().all()
    for m in markets:
        m.manager_id = None
    await session.delete(row)
    await session.commit()
    return {"ok": True}


@router.post("/admin/managers/{manager_id}/photo", response_model=ManagerOut)
async def manager_photo(
    manager_id: str,
    request: Request,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
) -> ManagerOut:
    row = await _load(session, manager_id)
    data = await file.read()
    photo_id = new_id()
    storage = build_storage(request.app.state.settings)
    keys = process_photo(storage, f"mgr-{row.id}", photo_id, data)
    row.photo_key = keys.get("card") or keys["full"]
    await session.commit()
    loaded = await _load(session, row.id)
    return _out(loaded, await _market_ids(session, loaded.id))


@router.get("/admin/markets")
async def admin_markets(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    from app.services.deals import list_markets

    return [market_out(m) for m in await list_markets(session)]
