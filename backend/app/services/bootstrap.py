from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.passwords import hash_password
from app.db.session import to_sync_url
from app.models import User, new_id


def seed_admin(settings: Settings) -> None:
    email = (settings.bootstrap_admin_email or "").strip().lower()
    password = settings.bootstrap_admin_password
    if not email or not password:
        return
    engine = create_engine(to_sync_url(settings.database_url))
    try:
        with Session(engine) as session:
            existing = session.scalar(select(User).where(User.email == email))
            if existing:
                return
            now = datetime.now(UTC)
            session.add(
                User(
                    id=new_id(),
                    email=email,
                    password_hash=hash_password(password),
                    role="admin",
                    status="active",
                    name="Admin",
                    token_version=1,
                    created_at=now,
                    approved_at=now,
                    email_verified_at=now,
                )
            )
            session.commit()
    finally:
        engine.dispose()
