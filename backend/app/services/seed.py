from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import to_sync_url
from app.models import Deal, DealPhoto, DealPriceHistory, Market, Notice, User, new_id


def _now() -> datetime:
    return datetime.now(UTC)


def _jpeg() -> bytes:
    try:
        from PIL import Image
    except ImportError:
        return b"\xff\xd8\xff\xe0" + b"\x00" * 64 + b"\xff\xd9"
    buf = BytesIO()
    Image.new("RGB", (32, 24), (180, 40, 40)).save(buf, format="JPEG")
    return buf.getvalue()


SEED_HOUSES = [
    ("916 Eldridge St", 69900_00, 110000_00, 25000_00, 6, True, 32.7767, -96.7970),
    ("2214 Maple Ave", 89900_00, 145000_00, 30000_00, 20, False, 32.7880, -96.8060),
    ("4801 Gaston Ave", 119900_00, 185000_00, 40000_00, 4, False, 32.7985, -96.7730),
    ("833 N Clinton Ave", 54900_00, 95000_00, 18000_00, 12, True, 32.7620, -96.8250),
    ("1515 S Ewing Ave", 74900_00, 125000_00, 22000_00, 30, False, 32.7440, -96.8120),
    ("3900 Spring Ave", 134900_00, 210000_00, 45000_00, 45, False, 32.8100, -96.7600),
    ("2708 S Harwood St", 99900_00, 160000_00, 28000_00, 9, False, 32.7680, -96.7830),
    ("1100 Combination Blvd", 159900_00, 240000_00, 50000_00, 18, False, 32.8200, -96.8400),
]


def seed_product(settings: Settings) -> None:
    engine = create_engine(to_sync_url(settings.database_url))
    try:
        with Session(engine) as session:
            if session.scalar(select(Market).limit(1)):
                return
            admin = session.scalar(select(User).where(User.role == "admin"))
            now = _now()
            market = Market(
                id=new_id(),
                slug="dallas",
                name="Dallas",
                state="TX",
                center_lat=32.7767,
                center_lng=-96.7970,
                zoom=11,
                timezone="America/Chicago",
            )
            session.add(market)
            session.add(
                Notice(
                    id=new_id(),
                    slug="tx-equitable-interest",
                    title="Texas equitable interest disclosure",
                    body=(
                        "The operator holds an equitable interest in this property and may not own title. "
                        "You must independently verify all information. No unaccompanied entry. No daisy-chaining."
                    ),
                    state="TX",
                    notice_version="2026-08-22",
                )
            )
            session.add(
                Notice(
                    id=new_id(),
                    slug="no-unaccompanied-entry",
                    title="NO UNACCOMPANIED ENTRY",
                    body="Do not enter vacant properties without a scheduled accompanied showing.",
                    notice_version="1",
                )
            )
            jpeg = _jpeg()
            from pathlib import Path

            root = Path(settings.local_media_dir)
            root.mkdir(parents=True, exist_ok=True)
            for i, (addr, price, arv, rehab, days, drop, lat, lng) in enumerate(SEED_HOUSES):
                deal_id = new_id()
                photo_id = new_id()
                close_by = (
                    now + timedelta(days=days) if days <= 7 or i < 2 else now + timedelta(days=days)
                )
                key = f"photos/{deal_id}/{photo_id}_card.jpg"
                (root / key).parent.mkdir(parents=True, exist_ok=True)
                (root / key).write_bytes(jpeg)
                deal = Deal(
                    id=deal_id,
                    market_id=market.id,
                    status="available",
                    list_price_cents=price,
                    arv_cents=arv,
                    rehab_low_cents=int(rehab * 0.8),
                    rehab_high_cents=rehab,
                    assignment_fee_cents=8000_00,
                    address1=addr,
                    city="Dallas",
                    state="TX",
                    postal_code="75201",
                    lat=lat,
                    lng=lng,
                    beds=3,
                    baths=2,
                    sqft=1200 + i * 80,
                    year_built=1952 + i,
                    occupancy="vacant",
                    access="lockbox",
                    property_type="SFR",
                    description=f"Investor pitch for {addr}. Off-market wholesale.",
                    lockbox_code=f"A{i}{i}{i}4",
                    deal_structure="assignment",
                    contract_close_by=close_by if i < 2 or days <= 7 else close_by,
                    contract_executed_at=now - timedelta(days=10),
                    option_period_ends_at=now + timedelta(days=3),
                    published_at=now,
                    created_by=admin.id if admin else None,
                    created_at=now,
                    updated_at=now,
                    offers_due_at=now + timedelta(days=5) if i == 0 else None,
                    cover_photo_id=photo_id,
                )
                session.add(deal)
                session.add(
                    DealPhoto(
                        id=photo_id,
                        deal_id=deal_id,
                        sort_order=0,
                        is_cover=True,
                        key_full=key,
                        key_card=key,
                        key_thumb=key,
                    )
                )
                if drop:
                    session.add(
                        DealPriceHistory(
                            id=new_id(),
                            deal_id=deal_id,
                            old_cents=price + 5000_00,
                            new_cents=price,
                            at=now - timedelta(days=2),
                        )
                    )
            session.commit()
    finally:
        engine.dispose()
