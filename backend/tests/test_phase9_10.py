from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO

from app.core.security import encode_jwt
from app.db.session import to_sync_url
from app.main import create_app
from app.models import Deal, Market, new_id
from app.services.match import pick_similar
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

ADMIN_PASSWORD = "correct-horse-admin1"
PASSWORD = "correct-horse-battery"
TERMS = "2026-08-22"


def _jpeg() -> bytes:
    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (40, 30), (40, 80, 40)).save(buf, format="JPEG")
    return buf.getvalue()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_pick_similar_price_band() -> None:
    now = datetime.now(UTC)
    base = Deal(
        id="a",
        market_id="m",
        status="assigned",
        list_price_cents=100_000,
        arv_cents=1,
        address1="gone",
        city="Dallas",
        state="TX",
        property_type="SFR",
        created_at=now,
        updated_at=now,
    )
    close = Deal(
        id="b",
        market_id="m",
        status="available",
        list_price_cents=110_000,
        arv_cents=1,
        address1="near",
        city="Dallas",
        state="TX",
        property_type="SFR",
        created_at=now,
        updated_at=now,
    )
    far = Deal(
        id="c",
        market_id="m",
        status="available",
        list_price_cents=200_000,
        arv_cents=1,
        address1="far",
        city="Dallas",
        state="TX",
        property_type="SFR",
        created_at=now,
        updated_at=now,
    )
    picked = pick_similar(base, [close, far])
    assert [d.id for d in picked] == ["b"]


async def _setup(settings, tmp_path):
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "public_mailing_address": "123 Main, Dallas TX",
            "local_media_dir": str(tmp_path / "media"),
        }
    )
    app = create_app(s)
    engine = create_engine(to_sync_url(s.database_url))
    with Session(engine) as session:
        m = Market(
            id=new_id(),
            slug="dallas",
            name="Dallas",
            state="TX",
            center_lat=32.77,
            center_lng=-96.79,
            zoom=11,
        )
        session.add(m)
        session.commit()
        mid = m.id
    engine.dispose()
    return s, app, mid


async def test_price_drop_notifies_watchers(settings, tmp_path) -> None:
    s, app, mid = await _setup(settings, tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        token = client.cookies.get("access")
        h = _auth(token)
        created = await client.post(
            "/api/v1/admin/deals",
            headers=h,
            json={
                "market_id": mid,
                "list_price_cents": 8000000,
                "arv_cents": 12000000,
                "address1": "10 Drop St",
                "city": "Dallas",
                "state": "TX",
            },
        )
        deal_id = created.json()["id"]
        await client.post(
            f"/api/v1/admin/deals/{deal_id}/photos",
            headers=h,
            files={"file": ("a.jpg", _jpeg(), "image/jpeg")},
        )
        await client.patch(f"/api/v1/admin/deals/{deal_id}", headers=h, json={"status": "available"})
        await client.post(
            "/api/v1/auth/register",
            json={"email": "w@example.com", "password": PASSWORD, "full_name": "W", "terms_version": TERMS},
        )
        buyers = await client.get("/api/v1/admin/buyers", headers=h)
        bid = next(b["id"] for b in buyers.json() if b["email"] == "w@example.com")
        await client.post(f"/api/v1/admin/buyers/{bid}/approve", headers=h, json={})
        await client.post("/api/v1/auth/login", json={"email": "w@example.com", "password": PASSWORD})
        bt = client.cookies.get("access")
        await client.post(f"/api/v1/deals/{deal_id}/saves", headers=_auth(bt), json={})
        await client.patch(f"/api/v1/admin/deals/{deal_id}", headers=h, json={"list_price_cents": 7000000})
        notes = await client.get("/api/v1/me/notifications", headers=_auth(bt))
        types = [n["type"] for n in notes.json()]
        assert "deal.price_drop" in types


async def test_track_click_increments_campaign(settings, tmp_path) -> None:
    s, app, _mid = await _setup(settings, tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        token = client.cookies.get("access")
        h = _auth(token)
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "b@example.com",
                "password": PASSWORD,
                "full_name": "B",
                "terms_version": TERMS,
                "phone": "2145550100",
            },
        )
        buyers = await client.get("/api/v1/admin/buyers", headers=h)
        bid = next(b["id"] for b in buyers.json() if b["email"] == "b@example.com")
        await client.post(f"/api/v1/admin/buyers/{bid}/approve", headers=h, json={})
        created = await client.post("/api/v1/admin/blasts", headers=h, json={"subject": "Hi", "body": "x"})
        assert created.status_code == 200, created.text
        cid = created.json()["id"]
        sent = await client.post(f"/api/v1/admin/blasts/{cid}/send", headers=h)
        assert sent.status_code == 200, sent.text
        track = encode_jwt(s, sub=bid, typ="track", ttl=timedelta(days=1), extra={"deal": "d1", "campaign": cid})
        res = await client.get(f"/api/v1/t/{track}", follow_redirects=False)
        assert res.status_code in {302, 307}
        rows = await client.get("/api/v1/admin/blasts", headers=h)
        camp = next(r for r in rows.json() if r["id"] == cid)
        assert camp["clicked"] == 1


async def test_csv_export_and_duplicate_phone(settings, tmp_path) -> None:
    _s, app, _mid = await _setup(settings, tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        token = client.cookies.get("access")
        h = _auth(token)
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "one@example.com",
                "password": PASSWORD,
                "full_name": "One",
                "phone": "214-555-0100",
                "terms_version": TERMS,
            },
        )
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "two@example.com",
                "password": PASSWORD,
                "full_name": "Two",
                "phone": "2145550100",
                "terms_version": TERMS,
            },
        )
        buyers = await client.get("/api/v1/admin/buyers?status=pending", headers=h)
        hints = [b.get("duplicate_hint") for b in buyers.json()]
        assert any(h for h in hints)
        csv = await client.get("/api/v1/admin/users/export", headers=h)
        assert csv.status_code == 200
        assert "one@example.com" in csv.text
        metrics = await client.get("/api/v1/admin/metrics/overview", headers=h)
        assert metrics.status_code == 200
        body = metrics.json()
        assert "funnel" in body
        assert "tier_conversion" in body
        assert "lead_sources" in body
