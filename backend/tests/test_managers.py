from app.db.session import to_sync_url
from app.main import create_app
from app.models import Market, new_id
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

ADMIN_PASSWORD = "correct-horse-admin1"


async def test_manager_assign_shows_on_markets(settings) -> None:
    s = settings.model_copy(
        update={"bootstrap_admin_email": "admin@example.com", "bootstrap_admin_password": ADMIN_PASSWORD}
    )
    app = create_app(s)
    engine = create_engine(to_sync_url(s.database_url))
    with Session(engine) as session:
        session.add(
            Market(
                id=new_id(),
                slug="dallas",
                name="Dallas",
                state="TX",
                center_lat=32.7,
                center_lng=-96.8,
            )
        )
        session.commit()
    engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        token = client.cookies.get("access")
        h = {"Authorization": f"Bearer {token}"}
        created = await client.post(
            "/api/v1/admin/managers",
            headers=h,
            json={"name": "Maggie Owen", "phone": "2145550100", "email": "m@x.com", "license": "TX 767801"},
        )
        assert created.status_code == 200, created.text
        mid = created.json()["id"]
        markets = await client.get("/api/v1/admin/markets", headers=h)
        assert markets.status_code == 200
        rows = markets.json()
        assert rows
        assigned = await client.patch(
            f"/api/v1/admin/managers/{mid}",
            headers=h,
            json={"market_ids": [rows[0]["id"]]},
        )
        assert assigned.status_code == 200
        again = await client.get("/api/v1/admin/markets", headers=h)
        dallas = next(m for m in again.json() if m["name"] == "Dallas")
        assert dallas["manager"]["name"] == "Maggie Owen"
        cleared = await client.patch(
            f"/api/v1/admin/managers/{mid}",
            headers=h,
            json={"market_ids": []},
        )
        assert cleared.status_code == 200
        assert cleared.json()["market_ids"] == []
        gone = await client.delete(f"/api/v1/admin/managers/{mid}", headers=h)
        assert gone.status_code == 200
        listed = await client.get("/api/v1/admin/managers", headers=h)
        assert all(r["id"] != mid for r in listed.json())
        forbidden = await client.post("/api/v1/auth/register", json={
            "email": "c@example.com",
            "password": "correct-horse-battery",
            "full_name": "C",
            "terms_version": "2026-08-22",
        })
        assert forbidden.status_code == 200
        await client.post("/api/v1/auth/login", json={"email": "c@example.com", "password": "correct-horse-battery"})
        steal = await client.post("/api/v1/admin/managers", json={"name": "Nope"})
        assert steal.status_code in {401, 403}


async def test_assign_city_from_dictionary_creates_market(settings) -> None:
    s = settings.model_copy(
        update={"bootstrap_admin_email": "admin@example.com", "bootstrap_admin_password": ADMIN_PASSWORD}
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        token = client.cookies.get("access")
        h = {"Authorization": f"Bearer {token}"}
        created = await client.post(
            "/api/v1/admin/managers",
            headers=h,
            json={"name": "Alex Agent", "places": [{"city": "Houston", "state": "TX"}]},
        )
        assert created.status_code == 200, created.text
        body = created.json()
        assert any(p["city"] == "Houston" and p["state"] == "TX" for p in body["places"])
        markets = await client.get("/api/v1/admin/markets", headers=h)
        houston = next(m for m in markets.json() if m["name"] == "Houston")
        assert houston["manager"]["name"] == "Alex Agent"
        cities = await client.get("/api/v1/admin/places?q=dallas&limit=20", headers=h)
        assert any(p["label"] == "Dallas, TX" for p in cities.json())
