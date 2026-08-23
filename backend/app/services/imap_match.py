from __future__ import annotations

import re

THREAD_TOKEN = re.compile(r"\[NS-([a-zA-Z0-9-]+)\]")


def match_from_address(from_addr: str, known: dict[str, str]) -> str | None:
    """known: email -> user_id"""
    return known.get(from_addr.strip().lower())


def match_thread_token(subject: str) -> str | None:
    found = THREAD_TOKEN.search(subject or "")
    return found.group(1) if found else None
