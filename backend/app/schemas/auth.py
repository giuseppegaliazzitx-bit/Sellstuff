from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str = Field(min_length=1, max_length=200)
    phone: str = Field(default="", max_length=40)
    company: str | None = Field(default=None, max_length=200)
    markets: list[str] = Field(default_factory=list)
    max_purchase_price_cents: int | None = None
    asset_types: list[str] = Field(default_factory=list)
    terms_version: str = Field(min_length=1)
    sms_consent: bool = False
    lead_source: str = "website"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str


class VerifyEmailIn(BaseModel):
    token: str


class AcceptTermsIn(BaseModel):
    terms_version: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    email_verified: bool
    terms_accepted: bool
    terms_version: str | None = None


class SessionOut(BaseModel):
    id: str
    family_id: str
    ip: str
    user_agent: str
    device_label: str
    issued_at: datetime
    last_used_at: datetime | None = None
    current: bool = False


class BuyerOut(BaseModel):
    id: str
    email: str
    name: str
    status: str
    role: str
    email_verified: bool
    company: str | None = None
    lead_source: str | None = None
    created_at: datetime
    phone: str = ""


class ApproveIn(BaseModel):
    note: str | None = None


class RejectIn(BaseModel):
    note: str | None = None
