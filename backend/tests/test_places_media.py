from __future__ import annotations

from io import BytesIO

import pytest
from app.main import create_app
from app.models import Market, new_id
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.session import to_sync_url

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
            slug="dallas-tx",
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


async def test_place_dictionary_autofills_city_state(admin_env) -> None:
    _s, _app, client, token, _mid = admin_env
    h = _auth(token)
    hits = await client.get("/api/v1/admin/places?q=dallas", headers=h)
    assert hits.status_code == 200
    labels = [p["label"] for p in hits.json()]
    assert "Dallas, TX" in labels
    dallas = next(p for p in hits.json() if p["city"] == "Dallas" and p["state"] == "TX")
    assert dallas["timezone"] == "America/Chicago"
    assert dallas["lat"]
    houston = await client.post(
        "/api/v1/admin/markets",
        headers=h,
        json={"city": "Houston", "state": "TX"},
    )
    assert houston.status_code == 200, houston.text
    body = houston.json()
    assert body["name"] == "Houston"
    assert body["city"] == "Houston"
    assert body["state"] == "TX"
    assert body["slug"] == "houston-tx"
    again = await client.post(
        "/api/v1/admin/markets",
        headers=h,
        json={"city": "Houston", "state": "TX"},
    )
    assert again.status_code == 409
    missing = await client.post(
        "/api/v1/admin/markets",
        headers=h,
        json={"city": "Notacity", "state": "ZZ"},
    )
    assert missing.status_code == 422
    live = await client.get("/api/v1/admin/markets?q=houston", headers=h)
    assert live.status_code == 200
    assert any(m["slug"] == "houston-tx" for m in live.json())


async def test_listing_photo_bytes_load_with_auth(admin_env) -> None:
    _s, _app, client, token, market_id = admin_env
    h = _auth(token)
    created = await client.post(
        "/api/v1/admin/deals",
        headers=h,
        json={
            "market_id": market_id,
            "list_price_cents": 6_990_000,
            "arv_cents": 11_000_000,
            "address1": "916 Eldridge St",
            "city": "Dallas",
            "state": "TX",
        },
    )
    assert created.status_code == 200, created.text
    deal_id = created.json()["id"]
    up = await client.post(
        f"/api/v1/admin/deals/{deal_id}/photos",
        headers=h,
        files={"file": ("a.jpg", _jpeg(), "image/jpeg")},
    )
    assert up.status_code == 200, up.text
    photos = up.json().get("photos") or []
    if not photos:
        again = await client.get(f"/api/v1/admin/deals/{deal_id}", headers=h)
        photos = again.json().get("photos") or []
    assert photos, up.text
    url = photos[0]
    assert url.startswith("/media/")
    img = await client.get(url, headers=h)
    assert img.status_code == 200, img.text
    assert img.headers["content-type"].startswith("image/")
    assert img.content[:3] == b"\xff\xd8\xff"
    transport = ASGITransport(app=_app)
    async with AsyncClient(transport=transport, base_url="http://test") as anon:
        no = await anon.get(url)
        assert no.status_code == 401
