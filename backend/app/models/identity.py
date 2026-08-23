from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON
from uuid_utils import uuid7

from app.db.base import Base


def new_id() -> str:
    return str(uuid7())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="client")  # client | admin
    status: Mapped[str] = mapped_column(String(16), default="pending")
    name: Mapped[str] = mapped_column(String(200))
    phone_raw: Mapped[str] = mapped_column(String(40), default="")
    token_version: Mapped[int] = mapped_column(Integer, default=1)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sms_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    profile: Mapped[BuyerProfile | None] = relationship(back_populates="user", uselist=False)
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(back_populates="user")
    terms: Mapped[list[TermsAcceptance]] = relationship(back_populates="user")


class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    company: Mapped[str] = mapped_column(String(200), default="")
    max_price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    asset_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    markets: Mapped[list[str]] = mapped_column(JSON, default=list)
    lead_source: Mapped[str] = mapped_column(String(40), default="website")
    email_alerts_enabled: Mapped[bool] = mapped_column(default=True)

    user: Mapped[User] = relationship(back_populates="profile")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (UniqueConstraint("token_hash", name="uq_refresh_token_hash"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    family_id: Mapped[str] = mapped_column(String(36), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("refresh_tokens.id"), nullable=True
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(Text, default="")
    device_label: Mapped[str] = mapped_column(String(120), default="")

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class TermsAcceptance(Base):
    __tablename__ = "terms_acceptance"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    terms_version: Mapped[str] = mapped_column(String(40))
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(Text, default="")
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="terms")
