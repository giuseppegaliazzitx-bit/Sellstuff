from __future__ import annotations

from app.main import create_app
from httpx import ASGITransport, AsyncClient

ADMIN_PASSWORD = "correct-horse-admin1"


async def test_negative_beds_rejected(settings) -> None:
    s = settings.model_copy(
        update={"bootstrap_admin_email": "admin@example.com", "bootstrap_admin_password": ADMIN_PASSWORD}
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        token = client.cookies.get("access")
        res = await client.post(
            "/api/v1/admin/deals",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "market_id": "missing",
                "list_price_cents": 10000,
                "arv_cents": 20000,
                "address1": "1 Neg St",
                "city": "Dallas",
                "beds": -1,
                "baths": 2,
            },
        )
        assert res.status_code == 422


async def test_preview_as_client_blocks_desk(settings) -> None:
    s = settings.model_copy(
        update={"bootstrap_admin_email": "admin@example.com", "bootstrap_admin_password": ADMIN_PASSWORD}
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
        csrf = client.cookies.get("csrf")
        preview = await client.post(
            "/api/v1/auth/preview-as-client",
            json={"enabled": True},
            headers={"X-CSRF-Token": csrf or "", "Origin": "http://localhost:5173"},
        )
        assert preview.status_code == 200, preview.text
        assert preview.json()["preview_as_client"] is True
        desk = await client.get("/api/v1/admin/buyers")
        assert desk.status_code == 403
        assert desk.json()["code"] == "preview_as_client"
        off = await client.post(
            "/api/v1/auth/preview-as-client",
            json={"enabled": False},
            headers={"X-CSRF-Token": csrf or "", "Origin": "http://localhost:5173"},
        )
        assert off.json()["preview_as_client"] is False
        desk2 = await client.get("/api/v1/admin/buyers")
        assert desk2.status_code == 200
