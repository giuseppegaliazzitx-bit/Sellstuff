from __future__ import annotations

import pyotp
from app.main import create_app
from httpx import ASGITransport, AsyncClient

ADMIN_PASSWORD = "correct-horse-admin1"


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_totp_enroll_and_login(settings) -> None:
    s = settings.model_copy(
        update={"bootstrap_admin_email": "admin@example.com", "bootstrap_admin_password": ADMIN_PASSWORD}
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD}
        )
        assert login.status_code == 200, login.text
        token = client.cookies.get("access")
        begin = await client.post(
            "/api/v1/auth/totp/begin",
            headers=_auth(token),
            json={"password": ADMIN_PASSWORD},
        )
        assert begin.status_code == 200, begin.text
        secret = begin.json()["secret"]
        code = pyotp.TOTP(secret).now()
        confirm = await client.post(
            "/api/v1/auth/totp/confirm",
            headers=_auth(token),
            json={"password": ADMIN_PASSWORD, "secret": secret, "code": code},
        )
        assert confirm.status_code == 200, confirm.text
        codes = confirm.json()["recovery_codes"]
        assert len(codes) == 10

        no_code = await client.post(
            "/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD}
        )
        assert no_code.status_code == 401
        assert no_code.json()["code"] == "totp_required"

        bad = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD, "totp_code": "000000"},
        )
        assert bad.status_code == 401
        assert bad.json()["code"] == "totp_invalid"

        ok = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD, "totp_code": pyotp.TOTP(secret).now()},
        )
        assert ok.status_code == 200, ok.text
        assert ok.json()["totp_enrolled"] is True

        rec = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD, "totp_code": codes[0]},
        )
        assert rec.status_code == 200, rec.text
        again = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD, "totp_code": codes[0]},
        )
        assert again.status_code == 401


async def test_admin_require_2fa_blocks_desk(settings) -> None:
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "admin_require_2fa": True,
        }
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD}
        )
        assert login.status_code == 200
        assert login.json()["totp_required"] is True
        token = client.cookies.get("access")
        desk = await client.get("/api/v1/admin/buyers", headers=_auth(token))
        assert desk.status_code == 403
        assert desk.json()["code"] == "totp_enrollment_required"
        begin = await client.post(
            "/api/v1/auth/totp/begin",
            headers=_auth(token),
            json={"password": ADMIN_PASSWORD},
        )
        assert begin.status_code == 200
