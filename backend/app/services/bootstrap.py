from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.passwords import hash_password
from app.db.session import to_sync_url
from app.models import BuyerProfile, User, new_id
from app.services.seed import seed_product

DEMO_BUYER_EMAIL = "buyer@localhost"
DEMO_BUYER_PASSWORD = "correct-horse-buyer1"


def create_admin(settings: Settings, *, email: str, password: str, name: str = "Admin") -> bool:
    engine = create_engine(to_sync_url(settings.database_url))
    try:
        with Session(engine) as session:
            existing = session.scalar(select(User).where(User.email == email.strip().lower()))
            if existing:
                return False
            now = datetime.now(UTC)
            session.add(
                User(
                    id=new_id(),
                    email=email.strip().lower(),
                    password_hash=hash_password(password),
                    role="admin",
                    status="active",
                    name=name,
                    token_version=1,
                    created_at=now,
                    approved_at=now,
                    email_verified_at=now,
                )
            )
            session.commit()
            return True
    finally:
        engine.dispose()


def seed_admin(settings: Settings) -> None:
    email = (settings.bootstrap_admin_email or "").strip().lower()
    password = settings.bootstrap_admin_password
    if email and password:
        engine = create_engine(to_sync_url(settings.database_url))
        try:
            with Session(engine) as session:
                existing = session.scalar(select(User).where(User.email == email))
                if not existing:
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
    if not __import__("os").environ.get("PYTEST_VERSION"):
        seed_demo_buyer(settings)
        seed_product(settings)


def seed_demo_buyer(settings: Settings) -> None:
    engine = create_engine(to_sync_url(settings.database_url))
    try:
        with Session(engine) as session:
            existing = session.scalar(select(User).where(User.email == DEMO_BUYER_EMAIL))
            if existing:
                return
            now = datetime.now(UTC)
            user = User(
                id=new_id(),
                email=DEMO_BUYER_EMAIL,
                password_hash=hash_password(DEMO_BUYER_PASSWORD),
                role="client",
                status="active",
                name="Demo Buyer",
                token_version=1,
                created_at=now,
                approved_at=now,
                email_verified_at=now,
            )
            session.add(user)
            session.flush()
            session.add(
                BuyerProfile(
                    user_id=user.id,
                    company="Demo Investments",
                    lead_source="seed",
                    tier="C",
                    markets=["Dallas"],
                    asset_types=["SFR"],
                )
            )
            session.commit()
    finally:
        engine.dispose()
