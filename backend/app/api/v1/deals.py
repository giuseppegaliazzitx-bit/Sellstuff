from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.denylist import assert_public_clean
from app.core.deps import get_db, require_active, require_user
from app.core.errors import AppError
from app.integrations.storage import build_storage
from app.models import (
    ContactEvent,
    DealAcknowledgment,
    DealDocument,
    Interest,
    Notice,
    SavedDeal,
    User,
    new_id,
)
from app.schemas.deals import DealPublic, MapPin, MarketOut
from app.services.deals import (
    client_can_see,
    get_deal,
    list_markets,
    list_public_deals,
    log_event,
    saved_ids,
    to_pins,
    to_public,
)

router = APIRouter(tags=["deals"])


def _tier(user: User) -> str:
    return user.profile.tier if user.profile else "C"


@router.get("/markets", response_model=list[MarketOut])
async def markets(
    _user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> list[MarketOut]:
    rows = await list_markets(session)
    return [
        MarketOut(
            id=m.id,
            slug=m.slug,
            name=m.name,
            state=m.state,
            center_lat=m.center_lat,
            center_lng=m.center_lng,
            zoom=m.zoom,
            timezone=m.timezone,
        )
        for m in rows
    ]


@router.get("/deals", response_model=list[DealPublic])
async def list_deals(
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
    market_id: str | None = None,
    sort: str = "newest",
    price_min: int | None = None,
    price_max: int | None = None,
    beds_min: int | None = None,
    property_type: str | None = None,
    occupancy: str | None = None,
) -> list[DealPublic]:
    deals = await list_public_deals(
        session,
        market_id=market_id,
        sort=sort,
        price_min=price_min,
        price_max=price_max,
        beds_min=beds_min,
        property_type=property_type,
        occupancy=occupancy,
        tier=_tier(user),
    )
    saved = await saved_ids(session, user.id)
    out = [to_public(d, saved=d.id in saved) for d in deals]
    for item in out:
        assert_public_clean(item.model_dump(mode="json"))
    return out


@router.get("/deals/{deal_id}", response_model=DealPublic)
async def deal_detail(
    deal_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> DealPublic:
    deal = await get_deal(session, deal_id)
    if not client_can_see(deal, tier=_tier(user)) and user.role != "admin":
        raise AppError(404, "not_found", "Deal not found")
    saved = deal.id in await saved_ids(session, user.id)
    payload = to_public(deal, saved=saved)
    assert_public_clean(payload.model_dump(mode="json"))
    await log_event(session, "deal.viewed", user_id=user.id, deal_id=deal.id)
    return payload


@router.get("/map/pins", response_model=list[MapPin])
async def map_pins(
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
    market_id: str | None = None,
    sort: str = "newest",
    price_min: int | None = None,
    price_max: int | None = None,
    beds_min: int | None = None,
    property_type: str | None = None,
    occupancy: str | None = None,
) -> list[MapPin]:
    deals = await list_public_deals(
        session,
        market_id=market_id,
        sort=sort,
        price_min=price_min,
        price_max=price_max,
        beds_min=beds_min,
        property_type=property_type,
        occupancy=occupancy,
        tier=_tier(user),
    )
    pins = await to_pins(deals)
    for pin in pins:
        assert_public_clean(pin.model_dump(mode="json"))
    return pins


@router.get("/deals/{deal_id}/documents")
async def deal_docs(
    deal_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    deal = await get_deal(session, deal_id)
    if not client_can_see(deal, tier=_tier(user)) and user.role != "admin":
        raise AppError(404, "not_found", "Deal not found")
    return [{"id": d.id, "kind": d.kind, "filename": d.filename} for d in deal.documents]


@router.get("/documents/{doc_id}/download")
async def download_doc(
    doc_id: str,
    request: Request,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
):
    doc = (await session.execute(select(DealDocument).where(DealDocument.id == doc_id))).scalar_one_or_none()
    if doc is None:
        raise AppError(404, "not_found", "Document not found")
    deal = await get_deal(session, doc.deal_id)
    if not client_can_see(deal, tier=_tier(user)) and user.role != "admin":
        raise AppError(404, "not_found", "Deal not found")
    doc.download_count += 1
    await log_event(session, "doc.downloaded", user_id=user.id, deal_id=deal.id, payload={"doc_id": doc.id})
    storage = build_storage(request.app.state.settings)
    path = storage.root / doc.storage_key
    if not path.exists():
        raise AppError(404, "not_found", "File missing")
    return FileResponse(path, filename=doc.filename, media_type="application/pdf")


@router.post("/deals/{deal_id}/saves")
async def save_deal(
    deal_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    existing = (
        await session.execute(select(SavedDeal).where(SavedDeal.user_id == user.id, SavedDeal.deal_id == deal_id))
    ).scalar_one_or_none()
    if existing is None:
        session.add(SavedDeal(id=new_id(), user_id=user.id, deal_id=deal_id, created_at=datetime.now(UTC)))
        await session.commit()
    return {"saved": True}


@router.delete("/deals/{deal_id}/saves")
async def unsave_deal(
    deal_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    existing = (
        await session.execute(select(SavedDeal).where(SavedDeal.user_id == user.id, SavedDeal.deal_id == deal_id))
    ).scalar_one_or_none()
    if existing:
        await session.delete(existing)
        await session.commit()
    return {"saved": False}


@router.post("/deals/{deal_id}/interests")
async def interest(
    deal_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    existing = (
        await session.execute(select(Interest).where(Interest.user_id == user.id, Interest.deal_id == deal_id))
    ).scalar_one_or_none()
    if existing is None:
        session.add(Interest(id=new_id(), user_id=user.id, deal_id=deal_id, created_at=datetime.now(UTC)))
        await session.commit()
    return {"interested": True}


@router.post("/deals/{deal_id}/acknowledge")
async def acknowledge(
    deal_id: str,
    request: Request,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    notice = (await session.execute(select(Notice).where(Notice.slug == "tx-equitable-interest"))).scalar_one_or_none()
    version = notice.notice_version if notice else "1"
    session.add(
        DealAcknowledgment(
            id=new_id(),
            user_id=user.id,
            deal_id=deal_id,
            notice_version=version,
            ip=request.client.host if request.client else "",
            accepted_at=datetime.now(UTC),
        )
    )
    await session.commit()
    return {"ok": True, "notice_version": version}


@router.post("/deals/{deal_id}/contact-events")
async def contact_event(
    deal_id: str,
    payload: dict,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    kind = str(payload.get("kind") or "call_clicked")
    session.add(
        ContactEvent(
            id=new_id(),
            user_id=user.id,
            deal_id=deal_id,
            kind=kind,
            at=datetime.now(UTC),
        )
    )
    await session.commit()
    return {"ok": True}


@router.get("/notices")
async def notices(
    _user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (await session.execute(select(Notice))).scalars().all()
    return [{"slug": n.slug, "title": n.title, "body": n.body, "notice_version": n.notice_version} for n in rows]
