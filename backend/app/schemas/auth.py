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
    totp_code: str | None = None


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
    totp_enrolled: bool = False
    totp_required: bool = False


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
    tier: str = "C"
    tags: list[str] = []
    do_not_contact: bool = False


class ApproveIn(BaseModel):
    note: str | None = None


class RejectIn(BaseModel):
    note: str | None = None


class ProfileOut(BaseModel):
    id: str
    email: str
    name: str
    phone: str = ""
    company: str = ""
    max_price_cents: int | None = None
    markets: list[str] = []
    asset_types: list[str] = []
    email_alerts_enabled: bool = True
    tier: str = "C"
    tags: list[str] = []
    do_not_contact: bool = False


class ProfilePatch(BaseModel):
    name: str | None = None
    phone: str | None = None
    company: str | None = None
    email_alerts_enabled: bool | None = None


class BuyBoxPut(BaseModel):
    max_price_cents: int | None = None
    markets: list[str] = []
    asset_types: list[str] = []


class TotpBeginIn(BaseModel):
    password: str


class TotpConfirmIn(BaseModel):
    password: str
    secret: str
    code: str


class TotpDisableIn(BaseModel):
    password: str
    code: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class BuyerPatch(BaseModel):
    tier: str | None = None
    tags: list[str] | None = None
    do_not_contact: bool | None = None
    company: str | None = None
