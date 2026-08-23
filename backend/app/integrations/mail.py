"""MailProvider: sandbox writes .eml; SMTP is unused until MAIL_* is set."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from app.core.config import Settings


class MailProvider(Protocol):
    sandbox: bool

    def send(self, *, to_addr: str, subject: str, body: str) -> str: ...


class SandboxProvider:
    sandbox = True

    def __init__(self, root: Path) -> None:
        self.root = root / "eml"
        self.root.mkdir(parents=True, exist_ok=True)

    def send(self, *, to_addr: str, subject: str, body: str) -> str:
        from uuid_utils import uuid7

        name = f"{uuid7()}.eml"
        (self.root / name).write_text(
            f"To: {to_addr}\nSubject: {subject}\n\n{body}\n",
            encoding="utf-8",
        )
        return name


class SmtpProvider:
    sandbox = False

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def send(self, *, to_addr: str, subject: str, body: str) -> str:
        import smtplib
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["From"] = self.settings.mail_from or self.settings.mail_username
        msg["To"] = to_addr
        msg["Subject"] = subject
        msg.set_content(body)
        password = (self.settings.mail_password or "").replace(" ", "")
        with smtplib.SMTP(self.settings.mail_smtp_host, self.settings.mail_smtp_port, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(self.settings.mail_username, password)
            smtp.send_message(msg)
        return msg.get("Message-ID") or "smtp"


def build_mail_provider(settings: Settings) -> MailProvider:
    if settings.mail_configured:
        return SmtpProvider(settings)
    return SandboxProvider(Path(settings.local_media_dir))
