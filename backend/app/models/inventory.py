from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.identity import new_id


class Market(Base):
    __tablename__ = "markets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    state: Mapped[str] = mapped_column(String(2), default="TX")
    center_lat: Mapped[float] = mapped_column(Float)
    center_lng: Mapped[float] = mapped_column(Float)
    zoom: Mapped[int] = mapped_column(Integer, default=10)
    timezone: Mapped[str] = mapped_column(String(64), default="America/Chicago")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    deals: Mapped[list[Deal]] = relationship(back_populates="market")


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    market_id: Mapped[str] = mapped_column(String(36), ForeignKey("markets.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="coming_soon", index=True)
    list_price_cents: Mapped[int] = mapped_column(Integer)
    arv_cents: Mapped[int] = mapped_column(Integer)
    rehab_low_cents: Mapped[int] = mapped_column(Integer, default=0)
    rehab_high_cents: Mapped[int] = mapped_column(Integer, default=0)
    assignment_fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    hud_fmr_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    address1: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(2))
    postal_code: Mapped[str] = mapped_column(String(16), default="")
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    beds: Mapped[int] = mapped_column(Integer, default=0)
    baths: Mapped[float] = mapped_column(Float, default=0)
    sqft: Mapped[int] = mapped_column(Integer, default=0)
    lot_sqft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_built: Mapped[int | None] = mapped_column(Integer, nullable=True)
    occupancy: Mapped[str] = mapped_column(String(40), default="vacant")
    access: Mapped[str] = mapped_column(String(40), default="lockbox")
    property_type: Mapped[str] = mapped_column(String(40), default="SFR")
    description: Mapped[str] = mapped_column(Text, default="")
    investor_highlights: Mapped[list] = mapped_column(JSON, default=list)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    offers_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    early_access_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deal_structure: Mapped[str] = mapped_column(String(32), default="assignment")
    contract_executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    option_period_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contract_close_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lockbox_code: Mapped[str] = mapped_column(String(40), default="")
    jv_partner_name: Mapped[str] = mapped_column(String(120), default="")
    jv_partner_phone: Mapped[str] = mapped_column(String(40), default="")
    jv_partner_email: Mapped[str] = mapped_column(String(200), default="")
    jv_fee_split_pct: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cover_photo_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    market: Mapped[Market] = relationship(back_populates="deals")
    photos: Mapped[list[DealPhoto]] = relationship(back_populates="deal", order_by="DealPhoto.sort_order")
    documents: Mapped[list[DealDocument]] = relationship(back_populates="deal")
    status_history: Mapped[list[DealStatusHistory]] = relationship(back_populates="deal")
    price_history: Mapped[list[DealPriceHistory]] = relationship(back_populates="deal")


class DealPhoto(Base):
    __tablename__ = "deal_photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False)
    key_full: Mapped[str] = mapped_column(String(400))
    key_card: Mapped[str] = mapped_column(String(400), default="")
    key_thumb: Mapped[str] = mapped_column(String(400), default="")
    content_type: Mapped[str] = mapped_column(String(80), default="image/jpeg")

    deal: Mapped[Deal] = relationship(back_populates="photos")


class DealDocument(Base):
    __tablename__ = "deal_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32), default="packet")
    filename: Mapped[str] = mapped_column(String(200))
    storage_key: Mapped[str] = mapped_column(String(400))
    content_type: Mapped[str] = mapped_column(String(80), default="application/pdf")
    download_count: Mapped[int] = mapped_column(Integer, default=0)

    deal: Mapped[Deal] = relationship(back_populates="documents")


class DealStatusHistory(Base):
    __tablename__ = "deal_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    from_status: Mapped[str] = mapped_column(String(24))
    to_status: Mapped[str] = mapped_column(String(24))
    reason: Mapped[str] = mapped_column(Text, default="")
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    deal: Mapped[Deal] = relationship(back_populates="status_history")


class DealPriceHistory(Base):
    __tablename__ = "deal_price_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    old_cents: Mapped[int] = mapped_column(Integer)
    new_cents: Mapped[int] = mapped_column(Integer)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    deal: Mapped[Deal] = relationship(back_populates="price_history")


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    notice_version: Mapped[str] = mapped_column(String(40), default="1")
