from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.identity import new_id


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    ip: Mapped[str] = mapped_column(String(64), default="")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SavedDeal(Base):
    __tablename__ = "saved_deals"
    __table_args__ = (UniqueConstraint("user_id", "deal_id", name="uq_saved_deal"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Interest(Base):
    __tablename__ = "interests"
    __table_args__ = (UniqueConstraint("user_id", "deal_id", name="uq_interest"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ContactEvent(Base):
    __tablename__ = "contact_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DealAcknowledgment(Base):
    __tablename__ = "deal_acknowledgments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    notice_version: Mapped[str] = mapped_column(String(40))
    ip: Mapped[str] = mapped_column(String(64), default="")
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    emd_cents: Mapped[int] = mapped_column(Integer, default=0)
    close_days: Mapped[int] = mapped_column(Integer, default=14)
    funding: Mapped[str] = mapped_column(String(32), default="cash")
    inspection_days: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(24), default="submitted")
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    counter_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    counter_note: Mapped[str] = mapped_column(Text, default="")
    is_late: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_offer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ShowingWindow(Base):
    __tablename__ = "showing_windows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer, default=6)
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="open")


class ShowingRsvp(Base):
    __tablename__ = "showing_rsvps"
    __table_args__ = (UniqueConstraint("window_id", "user_id", name="uq_rsvp"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    window_id: Mapped[str] = mapped_column(String(36), ForeignKey("showing_windows.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="confirmed")
    party_size: Mapped[int] = mapped_column(Integer, default=1)


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    subject: Mapped[str] = mapped_column(String(200), default="")
    deal_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("deals.id"), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    channel: Mapped[str] = mapped_column(String(16), default="chat")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ThreadParticipant(Base):
    __tablename__ = "thread_participants"
    __table_args__ = (UniqueConstraint("thread_id", "user_id", name="uq_participant"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    thread_id: Mapped[str] = mapped_column(String(36), ForeignKey("threads.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    thread_id: Mapped[str] = mapped_column(String(36), ForeignKey("threads.id"), index=True)
    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Outbox(Base):
    __tablename__ = "outbox"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(40))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dead_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UserNote(Base):
    __tablename__ = "user_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ImportedBuyer(Base):
    __tablename__ = "imported_buyers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), index=True)
    phone_e164: Mapped[str] = mapped_column(String(40), default="")
    name: Mapped[str] = mapped_column(String(200), default="")
    tier: Mapped[str] = mapped_column(String(8), default="C")
    claimed_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(80), index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    deal_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MailboxState(Base):
    __tablename__ = "mailbox_state"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="singleton")
    last_imap_uid: Mapped[int] = mapped_column(Integer, default=0)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str] = mapped_column(Text, default="")
    sent_today: Mapped[int] = mapped_column(Integer, default=0)
    sent_day: Mapped[str] = mapped_column(String(10), default="")


class BlastCampaign(Base):
    __tablename__ = "blast_campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("deals.id"), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    subject: Mapped[str] = mapped_column(String(200))
    body_template: Mapped[str] = mapped_column(Text, default="")
    segment: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    total: Mapped[int] = mapped_column(Integer, default=0)
    sent: Mapped[int] = mapped_column(Integer, default=0)
    clicked: Mapped[int] = mapped_column(Integer, default=0)
    estimated_finish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BlastRecipient(Base):
    __tablename__ = "blast_recipients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    campaign_id: Mapped[str] = mapped_column(String(36), ForeignKey("blast_campaigns.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    outbox_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str] = mapped_column(Text, default="")
    bounced: Mapped[bool] = mapped_column(Boolean, default=False)


class GeocodeCache(Base):
    __tablename__ = "geocode_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    query: Mapped[str] = mapped_column(String(400), unique=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
