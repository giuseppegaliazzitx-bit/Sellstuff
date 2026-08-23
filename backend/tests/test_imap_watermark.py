from app.services.imap_match import match_from_address, match_thread_token
from app.services.watermark import stamp_pdf


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
