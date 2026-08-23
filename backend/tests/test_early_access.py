from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO

from app.db.session import to_sync_url
from app.main import create_app
from app.models import Market, new_id
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

ADMIN_PASSWORD = "correct-horse-admin1"
PASSWORD = "correct-horse-battery"
TERMS = "2026-08-22"


def _jpeg() -> bytes:
    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (40, 30), (80, 80, 80)).save(buf, format="JPEG")
    return buf.getvalue()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _setup(settings):
    s = settings.model_copy(
        update={"bootstrap_admin_email": "admin@example.com", "bootstrap_admin_password": ADMIN_PASSWORD}
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
    return s, app, market_id


async def _approve(client: AsyncClient, token: str, email: str) -> str:
    buyers = await client.get("/api/v1/admin/buyers", headers=_auth(token))
    bid = next(b["id"] for b in buyers.json() if b["email"] == email)
    await client.post(f"/api/v1/admin/buyers/{bid}/approve", headers=_auth(token), json={})
    return bid


async def test_early_access_hides_from_tier_c(settings) -> None:
    _s, app, market_id = await _setup(settings)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        token = client.cookies.get("access")
        until = (datetime.now(UTC) + timedelta(hours=12)).isoformat()
        created = await client.post(
            "/api/v1/admin/deals",
            headers=_auth(token),
            json={
                "market_id": market_id,
                "list_price_cents": 7000000,
                "arv_cents": 12000000,
                "address1": "100 Early St",
                "city": "Dallas",
                "state": "TX",
                "early_access_until": until,
            },
        )
        assert created.status_code == 200, created.text
        deal_id = created.json()["id"]
        await client.post(
            f"/api/v1/admin/deals/{deal_id}/photos",
            headers=_auth(token),
            files={"file": ("a.jpg", _jpeg(), "image/jpeg")},
        )
        pub = await client.patch(
            f"/api/v1/admin/deals/{deal_id}",
            headers=_auth(token),
            json={"status": "available"},
        )
        assert pub.status_code == 200, pub.text
        assert pub.json()["early_access"] is True
        assert "early_access_until" in pub.json()

        await client.post(
            "/api/v1/auth/register",
            json={"email": "c@example.com", "password": PASSWORD, "full_name": "C", "terms_version": TERMS},
        )
        await client.post(
            "/api/v1/auth/register",
            json={"email": "a@example.com", "password": PASSWORD, "full_name": "A", "terms_version": TERMS},
        )
        await _approve(client, token, "c@example.com")
        aid = await _approve(client, token, "a@example.com")
        await client.patch(
            f"/api/v1/admin/buyers/{aid}",
            headers=_auth(token),
            json={"tier": "A"},
        )

        await client.post("/api/v1/auth/login", json={"email": "c@example.com", "password": PASSWORD})
        ctok = client.cookies.get("access")
        hidden = await client.get(f"/api/v1/deals/{deal_id}", headers=_auth(ctok))
        assert hidden.status_code == 404
        listing = await client.get("/api/v1/deals", headers=_auth(ctok))
        assert deal_id not in {d["id"] for d in listing.json()}

        await client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD})
        atok = client.cookies.get("access")
        shown = await client.get(f"/api/v1/deals/{deal_id}", headers=_auth(atok))
        assert shown.status_code == 200, shown.text
        assert shown.json()["early_access"] is True
        assert "early_access_until" not in shown.json()
        assert "rehab_high_cents" not in shown.json()

        past = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
        await client.patch(
            f"/api/v1/admin/deals/{deal_id}",
            headers=_auth(token),
            json={"early_access_until": past},
        )
        await client.post("/api/v1/auth/login", json={"email": "c@example.com", "password": PASSWORD})
        ctok = client.cookies.get("access")
        after = await client.get(f"/api/v1/deals/{deal_id}", headers=_auth(ctok))
        assert after.status_code == 200
        assert after.json()["early_access"] is False
