"""IMAP poll worker. No-op when MAIL_* is blank."""

from __future__ import annotations

from app.core.config import Settings
from app.services.imap_inbound import poll_inbox


def run_poll(settings: Settings, last_uid: int = 0) -> list[dict]:
    return poll_inbox(settings, last_uid=last_uid)
