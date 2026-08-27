from __future__ import annotations

from io import BytesIO

import pytest
from app.db.session import to_sync_url
from app.main import create_app
from app.models import Market, new_id
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

ADMIN_PASSWORD = "correct-horse-admin1"


def _jpeg() -> bytes:
    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (40, 30), (120, 40, 40)).save(buf, format="JPEG")
    return buf.getvalue()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def admin_env(settings):
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
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
        market_id = m.id
    engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD},
        )
        assert login.status_code == 200, login.text
        token = client.cookies.get("access")
        yield s, app, client, token, market_id


async def test_create_deal_assigns_market_from_city_state(admin_env) -> None:
    _s, _app, client, token, dallas_id = admin_env
    h = _auth(token)
    created = await client.post(
        "/api/v1/admin/deals",
        headers=h,
        json={
            "address1": "100 Main St",
            "city": "Houston",
            "state": "TX",
            "list_price_cents": 80_000_00,
            "arv_cents": 120_000_00,
        },
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["city"] == "Houston"
    assert body["state"] == "TX"
    assert body["market_id"] != dallas_id
    markets = await client.get("/api/v1/admin/markets", headers=h)
    houston = next(m for m in markets.json() if m["name"] == "Houston")
    assert body["market_id"] == houston["id"]
    assert houston["listing_count"] == 0
    await client.post(
        f"/api/v1/admin/deals/{body['id']}/photos",
        headers=h,
        files={"file": ("a.jpg", _jpeg(), "image/jpeg")},
    )
    pub = await client.patch(
        f"/api/v1/admin/deals/{body['id']}",
        headers=h,
        json={"status": "available"},
    )
    assert pub.status_code == 200, pub.text
    live = await client.get("/api/v1/markets", headers=h)
    slugs = [m["slug"] for m in live.json()]
    assert "houston-tx" in slugs
    dallas_live = [m for m in live.json() if m["name"] == "Dallas"]
    assert dallas_live == []
    gone = await client.delete(f"/api/v1/admin/deals/{body['id']}", headers=h)
    assert gone.status_code == 200
    live2 = await client.get("/api/v1/markets", headers=h)
    assert not any(m["name"] == "Houston" for m in live2.json())
    desk = await client.get("/api/v1/admin/markets", headers=h)
    assert any(m["name"] == "Houston" for m in desk.json())


async def test_deactivate_market_keeps_row_for_reuse(admin_env) -> None:
    _s, _app, client, token, dallas_id = admin_env
    h = _auth(token)
    rm = await client.delete(f"/api/v1/admin/markets/{dallas_id}", headers=h)
    assert rm.status_code == 200
    listed = await client.get("/api/v1/admin/markets", headers=h)
    assert not any(m["id"] == dallas_id for m in listed.json())
    created = await client.post(
        "/api/v1/admin/deals",
        headers=h,
        json={
            "address1": "916 Eldridge St",
            "city": "Dallas",
            "state": "TX",
            "list_price_cents": 69_900_00,
            "arv_cents": 110_000_00,
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["market_id"] == dallas_id
    listed2 = await client.get("/api/v1/admin/markets", headers=h)
    assert any(m["id"] == dallas_id for m in listed2.json())
