from __future__ import annotations

from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

from sqlalchemy import and_, func, inspect as sa_inspect, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.core.errors import AppError
from app.models import (
    AuditLog,
    Deal,
    DealPriceHistory,
    DealStatusHistory,
    Event,
    Market,
    SavedDeal,
    new_id,
)
from app.schemas.deals import (
    DealAdmin,
    DealCreate,
    DealPatch,
    DealPublic,
    ManagerOut,
    MapPin,
    MarketOut,
    ManagerPlace,
    PriceHistoryPublic,
)
from app.services.money import mao_cents, price_label
from app.services.status import CLIENT_VISIBLE, assert_transition

ALLOWED_VIDEO = {
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
    "vimeo.com",
    "www.vimeo.com",
    "matterport.com",
    "my.matterport.com",
}


def _now() -> datetime:
    return datetime.now(UTC)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _days_on_market(deal: Deal) -> int | None:
    pub = _aware(deal.published_at)
    if pub is None:
        return None
    return max(0, int((_now() - pub).total_seconds() // 86400))


def sanitize_video(url: str | None) -> str | None:
    if not url:
        return None
    host = (urlparse(url).hostname or "").lower()
    if host in ALLOWED_VIDEO or any(host.endswith("." + h) for h in ALLOWED_VIDEO):
        return url
    return None


def _photo_url(key: str) -> str:
    return f"/media/{key}"


def to_public(deal: Deal, *, saved: bool = False) -> DealPublic:
    photos = [_photo_url(p.key_card or p.key_full) for p in deal.photos]
    cover = None
    for p in deal.photos:
        if p.is_cover:
            cover = _photo_url(p.key_card or p.key_full)
            break
    if not cover and photos:
        cover = photos[0]
    reductions = []
    reduced = None
    for row in deal.price_history:
        if row.new_cents < row.old_cents:
            reductions.append(PriceHistoryPublic(old_cents=row.old_cents, new_cents=row.new_cents, at=row.at))
            reduced = row.old_cents - row.new_cents
    until = _aware(deal.early_access_until)
    early = bool(until and until > _now())
    return DealPublic(
        id=deal.id,
        market_id=deal.market_id,
        market_name=deal.market.name if deal.market else "",
        market_timezone=deal.market.timezone if deal.market else "America/Chicago",
        status=deal.status,
        list_price_cents=deal.list_price_cents,
        arv_cents=deal.arv_cents,
        address1=deal.address1,
        city=deal.city,
        state=deal.state,
        postal_code=deal.postal_code,
        lat=deal.lat,
        lng=deal.lng,
        beds=deal.beds,
        baths=deal.baths,
        sqft=deal.sqft,
        year_built=deal.year_built,
        occupancy=deal.occupancy,
        access=deal.access,
        property_type=deal.property_type,
        description=deal.description,
        offers_due_at=deal.offers_due_at,
        video_url=sanitize_video(deal.video_url),
        photos=photos,
        cover_photo=cover,
        price_history=reductions,
        reduced_cents=reduced,
        saved=saved,
        early_access=early,
    )


def to_admin(deal: Deal) -> DealAdmin:
    pub = to_public(deal)
    days = None
    close = _aware(deal.contract_close_by)
    if close:
        days = int((close - _now()).total_seconds() // 86400)
    return DealAdmin(
        **pub.model_dump(),
        rehab_low_cents=deal.rehab_low_cents,
        rehab_high_cents=deal.rehab_high_cents,
        assignment_fee_cents=deal.assignment_fee_cents,
        mao_cents=mao_cents(deal.arv_cents, deal.rehab_high_cents, deal.assignment_fee_cents),
        lockbox_code=deal.lockbox_code,
        deal_structure=deal.deal_structure,
        contract_executed_at=deal.contract_executed_at,
        option_period_ends_at=deal.option_period_ends_at,
        contract_close_by=deal.contract_close_by,
        jv_partner_name=deal.jv_partner_name,
        jv_partner_phone=deal.jv_partner_phone,
        jv_partner_email=deal.jv_partner_email,
        jv_fee_split_pct=deal.jv_fee_split_pct,
        hud_fmr_cents=deal.hud_fmr_cents,
        days_to_close=days,
        early_access_until=deal.early_access_until,
        published_at=deal.published_at,
        days_on_market=_days_on_market(deal),
    )


def _deal_load():
    return (
        selectinload(Deal.photos),
        selectinload(Deal.documents),
        selectinload(Deal.price_history),
        selectinload(Deal.market),
    )


async def get_deal(session: AsyncSession, deal_id: str, *, include_deleted: bool = False) -> Deal:
    stmt = select(Deal).options(*_deal_load()).where(Deal.id == deal_id)
    if not include_deleted:
        stmt = stmt.where(Deal.deleted_at.is_(None))
    deal = (await session.execute(stmt)).scalar_one_or_none()
    if deal is None:
        raise AppError(404, "not_found", "Deal not found")
    return deal


def client_can_see(deal: Deal, *, tier: str = "C") -> bool:
    if deal.deleted_at is not None:
        return False
    if deal.status not in CLIENT_VISIBLE:
        return False
    until = _aware(deal.early_access_until)
    if until and until > _now() and tier != "A":
        return False
    return True


async def list_public_deals(
    session: AsyncSession,
    *,
    market_id: str | None,
    sort: str = "newest",
    price_min: int | None = None,
    price_max: int | None = None,
    beds_min: int | None = None,
    property_type: str | None = None,
    occupancy: str | None = None,
    tier: str = "C",
) -> list[Deal]:
    stmt = select(Deal).options(*_deal_load()).where(Deal.deleted_at.is_(None), Deal.status.in_(CLIENT_VISIBLE))
    if market_id:
        stmt = stmt.where(Deal.market_id == market_id)
    if price_min is not None:
        stmt = stmt.where(Deal.list_price_cents >= price_min)
    if price_max is not None:
        stmt = stmt.where(Deal.list_price_cents <= price_max)
    if beds_min is not None:
        stmt = stmt.where(Deal.beds >= beds_min)
    if property_type:
        stmt = stmt.where(Deal.property_type == property_type)
    if occupancy:
        stmt = stmt.where(Deal.occupancy == occupancy)
    deals = list((await session.execute(stmt)).scalars().unique().all())
    visible = [d for d in deals if client_can_see(d, tier=tier)]
    return sort_deals(visible, sort)


def sort_deals(deals: list[Deal], sort: str) -> list[Deal]:
    if sort == "price_asc":
        return sorted(deals, key=lambda d: d.list_price_cents)
    if sort == "price_desc":
        return sorted(deals, key=lambda d: d.list_price_cents, reverse=True)
    if sort == "beds":
        return sorted(deals, key=lambda d: d.beds, reverse=True)
    if sort == "baths":
        return sorted(deals, key=lambda d: d.baths, reverse=True)
    if sort == "sqft":
        return sorted(deals, key=lambda d: d.sqft, reverse=True)
    return sorted(deals, key=lambda d: d.created_at, reverse=True)


async def list_admin_deals(session: AsyncSession, *, deleted: bool = False, q: str | None = None) -> list[Deal]:
    stmt = select(Deal).options(*_deal_load())
    if deleted:
        stmt = stmt.where(Deal.deleted_at.is_not(None))
    else:
        stmt = stmt.where(Deal.deleted_at.is_(None))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Deal.address1.ilike(like), Deal.city.ilike(like)))
    deals = list((await session.execute(stmt)).scalars().unique().all())
    deals.sort(
        key=lambda d: (
            _aware(d.contract_close_by) or datetime.max.replace(tzinfo=UTC),
            d.created_at,
        )
    )
    return deals


async def create_deal(session: AsyncSession, payload: DealCreate, actor_id: str) -> Deal:
    now = _now()
    data = payload.model_dump()
    city = str(data.get("city") or "").strip()
    state = str(data.get("state") or "TX").strip().upper()
    data["city"] = city
    data["state"] = state
    market = await ensure_market(session, city, state)
    data["market_id"] = market.id
    if data.get("lat") is None:
        data["lat"] = market.center_lat
    if data.get("lng") is None:
        data["lng"] = market.center_lng
    deal = Deal(
        id=new_id(),
        created_at=now,
        updated_at=now,
        created_by=actor_id,
        **data,
    )
    if deal.status == "available":
        deal.published_at = now
    session.add(deal)
    session.add(
        DealStatusHistory(
            id=new_id(),
            deal_id=deal.id,
            from_status="",
            to_status=deal.status,
            actor_id=actor_id,
            at=now,
        )
    )
    await session.commit()
    return await get_deal(session, deal.id)


async def patch_deal(
    session: AsyncSession,
    deal: Deal,
    payload: DealPatch,
    actor_id: str,
    ip: str = "",
    settings: Settings | None = None,
) -> Deal:
    now = _now()
    data = payload.model_dump(exclude_unset=True)
    diffs: dict = {}
    notify = False
    price_drop: tuple[int, int] | None = None
    gone = False
    if "list_price_cents" in data and data["list_price_cents"] != deal.list_price_cents:
        old = deal.list_price_cents
        hist_row = DealPriceHistory(
            id=new_id(),
            deal_id=deal.id,
            old_cents=old,
            new_cents=data["list_price_cents"],
            actor_id=actor_id,
            at=now,
        )
        session.add(hist_row)
        deal.price_history.append(hist_row)
        diffs["list_price_cents"] = [old, data["list_price_cents"]]
        if data["list_price_cents"] < old:
            price_drop = (old, data["list_price_cents"])
    if "status" in data and data["status"] != deal.status:
        assert_transition(deal.status, data["status"])
        session.add(
            DealStatusHistory(
                id=new_id(),
                deal_id=deal.id,
                from_status=deal.status,
                to_status=data["status"],
                actor_id=actor_id,
                at=now,
            )
        )
        if data["status"] == "available":
            if not deal.photos:
                raise AppError(422, "photo_required", "Publish requires at least one photo")
            if deal.published_at is None:
                deal.published_at = now
                hours = settings.early_access_default_hours if settings else 0
                if deal.early_access_until is None and hours > 0 and "early_access_until" not in data:
                    deal.early_access_until = now + timedelta(hours=hours)
            notify = True
        if data["status"] in {"assigned", "closed"}:
            gone = True
        diffs["status"] = [deal.status, data["status"]]
    if "lockbox_code" in data:
        session.add(
            AuditLog(
                id=new_id(),
                actor_id=actor_id,
                action="lockbox.read_or_write",
                entity_type="deal",
                entity_id=deal.id,
                ip=ip,
                metadata_json={"lockbox": "touched"},
                at=now,
            )
        )
    for key, value in data.items():
        setattr(deal, key, value)
    if "city" in data or "state" in data:
        market = await ensure_market(session, deal.city, deal.state)
        deal.market_id = market.id
        if deal.lat is None:
            deal.lat = market.center_lat
        if deal.lng is None:
            deal.lng = market.center_lng
    deal.updated_at = now
    if diffs:
        session.add(
            AuditLog(
                id=new_id(),
                actor_id=actor_id,
                action="deal.patch",
                entity_type="deal",
                entity_id=deal.id,
                ip=ip,
                metadata_json=diffs,
                at=now,
            )
        )
    await session.commit()
    deal_id = deal.id
    if notify:
        from app.services.match import notify_matches

        deal = await get_deal(session, deal_id)
        await notify_matches(session, deal)
    if price_drop:
        from app.services.match import notify_price_drop

        deal = await get_deal(session, deal_id)
        await notify_price_drop(session, deal, price_drop[0], price_drop[1])
    if gone:
        from app.services.match import notify_gone

        deal = await get_deal(session, deal_id)
        await notify_gone(session, deal)
    return await get_deal(session, deal_id)


async def soft_delete(session: AsyncSession, deal: Deal) -> None:
    deal.deleted_at = _now()
    await session.commit()


async def to_pins(deals: list[Deal]) -> list[MapPin]:
    pins = []
    for d in deals:
        if d.lat is None or d.lng is None:
            continue
        reduced = any(h.new_cents < h.old_cents for h in d.price_history)
        pins.append(
            MapPin(
                id=d.id,
                lat=d.lat,
                lng=d.lng,
                list_price_cents=d.list_price_cents,
                price_label=price_label(d.list_price_cents),
                status=d.status,
                reduced=reduced,
                offers_due_at=d.offers_due_at,
            )
        )
    return pins


def manager_out(row, *, market_ids: list[str] | None = None) -> ManagerOut:
    photo = f"/media/{row.photo_key}" if row.photo_key else None
    if market_ids is None:
        market_ids = [m.id for m in getattr(row, "markets", None) or []]
    places: list[ManagerPlace] = []
    if "markets" not in sa_inspect(row).unloaded:
        places = [
            ManagerPlace(city=m.name, state=m.state, label=f"{m.name}, {m.state}", market_id=m.id)
            for m in (row.markets or [])
        ]
    return ManagerOut(
        id=row.id,
        name=row.name,
        phone=row.phone,
        email=row.email,
        license=row.license,
        photo_url=photo,
        market_ids=list(market_ids),
        places=places,
    )


def market_out(m: Market, listing_count: int = 0) -> MarketOut:
    mgr = m.manager
    city = m.name
    return MarketOut(
        id=m.id,
        slug=m.slug,
        name=m.name,
        city=city,
        state=m.state,
        center_lat=m.center_lat,
        center_lng=m.center_lng,
        zoom=m.zoom,
        timezone=m.timezone,
        listing_count=listing_count,
        manager=manager_out(mgr, market_ids=[m.id]) if mgr else None,
    )


def market_slug(city: str, state: str) -> str:
    raw = f"{city}-{state}".strip().lower()
    out = []
    prev_dash = False
    for ch in raw:
        if ch.isalnum():
            out.append(ch)
            prev_dash = False
        elif not prev_dash:
            out.append("-")
            prev_dash = True
    return "".join(out).strip("-")


async def live_listing_counts(session: AsyncSession) -> dict[str, int]:
    rows = (
        await session.execute(
            select(Deal.market_id, func.count())
            .where(Deal.deleted_at.is_(None), Deal.status.in_(CLIENT_VISIBLE))
            .group_by(Deal.market_id)
        )
    ).all()
    return {mid: int(n) for mid, n in rows if mid}


async def list_markets(
    session: AsyncSession,
    q: str | None = None,
    *,
    listed_only: bool = False,
    include_inactive: bool = False,
) -> list[Market]:
    stmt = select(Market).options(selectinload(Market.manager))
    if not include_inactive:
        stmt = stmt.where(Market.is_active.is_(True))
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Market.name.ilike(like), Market.state.ilike(like), Market.slug.ilike(like)))
    stmt = stmt.order_by(Market.state, Market.name)
    rows = list((await session.execute(stmt)).scalars().all())
    if listed_only:
        counts = await live_listing_counts(session)
        rows = [m for m in rows if counts.get(m.id, 0) > 0]
    return rows


async def ensure_market(session: AsyncSession, city: str, state: str) -> Market:
    city = (city or "").strip()
    state = (state or "").strip().upper()
    if not city or not state:
        raise AppError(422, "market_required", "City and state are required to place a listing")
    existing = (
        await session.execute(
            select(Market).options(selectinload(Market.manager)).where(Market.name.ilike(city), Market.state == state)
        )
    ).scalar_one_or_none()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            await session.flush()
        return existing
    from app.data.us_places import lookup_place

    place = lookup_place(city, state)
    slug = market_slug(place["city"] if place else city, state)
    slug_hit = (
        await session.execute(select(Market).options(selectinload(Market.manager)).where(Market.slug == slug))
    ).scalar_one_or_none()
    if slug_hit:
        if not slug_hit.is_active:
            slug_hit.is_active = True
            await session.flush()
        return slug_hit
    row = Market(
        id=new_id(),
        slug=slug,
        name=place["city"] if place else city.title(),
        state=state,
        center_lat=place["lat"] if place else 0.0,
        center_lng=place["lng"] if place else 0.0,
        zoom=11,
        timezone=place["timezone"] if place else "America/Chicago",
        is_active=True,
    )
    session.add(row)
    await session.flush()
    return row


async def deactivate_market(session: AsyncSession, market_id: str) -> Market:
    row = (
        await session.execute(select(Market).options(selectinload(Market.manager)).where(Market.id == market_id))
    ).scalar_one_or_none()
    if row is None:
        raise AppError(404, "not_found", "Market not found")
    row.is_active = False
    await session.commit()
    return row


async def create_market_from_place(session: AsyncSession, city: str, state: str) -> Market:
    from app.data.us_places import lookup_place

    place = lookup_place(city, state)
    if not place:
        raise AppError(422, "unknown_place", "City is not in the market dictionary")
    slug = market_slug(place["city"], place["state"])
    existing = (
        await session.execute(
            select(Market).where(
                or_(
                    Market.slug == slug,
                    and_(Market.name.ilike(place["city"]), Market.state == place["state"]),
                )
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise AppError(409, "market_exists", f"{place['label']} is already a market")
    row = Market(
        id=new_id(),
        slug=slug,
        name=place["city"],
        state=place["state"],
        center_lat=place["lat"],
        center_lng=place["lng"],
        zoom=11,
        timezone=place["timezone"],
        is_active=True,
    )
    session.add(row)
    await session.commit()
    loaded = (
        await session.execute(select(Market).options(selectinload(Market.manager)).where(Market.id == row.id))
    ).scalar_one()
    return loaded


async def log_event(
    session: AsyncSession,
    name: str,
    *,
    user_id: str | None,
    deal_id: str | None,
    payload: dict | None = None,
) -> None:
    session.add(
        Event(
            id=new_id(),
            name=name,
            user_id=user_id,
            deal_id=deal_id,
            payload=payload or {},
            at=_now(),
        )
    )
    await session.commit()


async def saved_ids(session: AsyncSession, user_id: str) -> set[str]:
    rows = (await session.execute(select(SavedDeal.deal_id).where(SavedDeal.user_id == user_id))).all()
    return {r[0] for r in rows}
