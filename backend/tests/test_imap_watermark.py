from app.main import create_app
from app.services.imap_inbound import is_bounce, poll_inbox
from app.services.imap_match import match_from_address, match_thread_token
from app.services.watermark import stamp_pdf
from httpx import ASGITransport, AsyncClient


def test_imap_matches_known_email() -> None:
    assert match_from_address("Ann@X.com", {"ann@x.com": "u1"}) == "u1"
    assert match_from_address("nobody@x.com", {"ann@x.com": "u1"}) is None


def test_imap_thread_token() -> None:
    assert match_thread_token("Re: [NS-abc-123] still available?") == "abc-123"
    assert match_thread_token("hello") is None


def test_watermark_keeps_pdf() -> None:
    raw = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    out = stamp_pdf(raw, "buyer@example.com")
    assert out.startswith(b"%PDF")


def test_bounce_detect() -> None:
    assert is_bounce("mailer-daemon@google.com", "Delivery Status Notification")
    assert not is_bounce("buyer@x.com", "still available?")


def test_poll_inbox_sandbox(settings) -> None:
    assert poll_inbox(settings, last_uid=0) == []


async def test_ingest_idempotent_and_unmatched(settings) -> None:
    s = settings.model_copy(
        update={"bootstrap_admin_email": "admin@example.com", "bootstrap_admin_password": "correct-horse-admin1"}
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "correct-horse-admin1"},
        )
        token = client.cookies.get("access")
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "message_id": "<one@x>",
            "from_addr": "stranger@x.com",
            "subject": "hello",
            "body": "who are you",
        }
        first = await client.post("/api/v1/admin/mail/ingest", headers=headers, json=payload)
        assert first.status_code == 200, first.text
        assert first.json()["unmatched"] is True
        second = await client.post("/api/v1/admin/mail/ingest", headers=headers, json=payload)
        assert second.json()["id"] == first.json()["id"]
        unmatched = await client.get("/api/v1/admin/mail/unmatched", headers=headers)
        assert len(unmatched.json()) == 1
