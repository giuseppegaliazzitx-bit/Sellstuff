from __future__ import annotations

from app.main import create_app
from httpx import ASGITransport, AsyncClient

ADMIN_PASSWORD = "correct-horse-admin1"
PASSWORD = "correct-horse-battery"


async def test_chat_and_mail_sandbox(settings) -> None:
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "mail_password": "",
        }
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD},
        )
        admin = client.cookies.get("access")
        h = {"Authorization": f"Bearer {admin}"}
        status = await client.get("/api/v1/mail/status", headers=h)
        assert status.status_code == 200
        assert status.json()["sandbox"] is True
        thread = await client.post("/api/v1/threads", headers=h, json={"subject": "hello"})
        assert thread.status_code == 200
        tid = thread.json()["id"]
        empty = await client.post(f"/api/v1/threads/{tid}/messages", headers=h, json={"body": "  "})
        assert empty.status_code == 422
        msg = await client.post(f"/api/v1/threads/{tid}/messages", headers=h, json={"body": "still available?"})
        assert msg.status_code == 200
        listed = await client.get(f"/api/v1/threads/{tid}/messages", headers=h)
        assert listed.status_code == 200
        assert listed.json()[0]["body"] == "still available?"
        metrics = await client.get("/api/v1/admin/metrics/overview", headers=h)
        assert metrics.status_code == 200
        mail = await client.post(
            "/api/v1/mail/outbound",
            headers=h,
            json={"body": "hi", "subject": "test", "lane": 1},
        )
        assert mail.status_code == 200
        assert mail.json()["sandbox"] is True


async def test_client_forbidden_mail_status(settings) -> None:
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "require_admin_approval": False,
        }
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "x@example.com",
                "password": PASSWORD,
                "full_name": "X",
                "terms_version": "2026-08-22",
            },
        )
        await client.post("/api/v1/auth/login", json={"email": "x@example.com", "password": PASSWORD})
        res = await client.get("/api/v1/mail/status")
        assert res.status_code == 403
