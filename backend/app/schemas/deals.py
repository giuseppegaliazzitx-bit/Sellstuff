from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.money import mao_cents


class PriceHistoryPublic(BaseModel):
    old_cents: int
    new_cents: int
    at: datetime


class DealPublic(BaseModel):
    model_config = ConfigDict(from_attributes=False)

    id: str
    market_id: str
    market_name: str = ""
    market_timezone: str = "America/Chicago"
    status: str
    list_price_cents: int
    arv_cents: int
    address1: str
    city: str
    state: str
    postal_code: str
    lat: float | None = None
    lng: float | None = None
    beds: int
    baths: float
    sqft: int
    year_built: int | None = None
    occupancy: str
    access: str
    property_type: str
    description: str = ""
    offers_due_at: datetime | None = None
    video_url: str | None = None
    photos: list[str] = Field(default_factory=list)
    cover_photo: str | None = None
    price_history: list[PriceHistoryPublic] = Field(default_factory=list)
    reduced_cents: int | None = None
    saved: bool = False
    early_access: bool = False


class DealAdmin(DealPublic):
    rehab_low_cents: int = 0
    rehab_high_cents: int = 0
    assignment_fee_cents: int = 0
    mao_cents: int = 0
    lockbox_code: str = ""
    deal_structure: str = "assignment"
    contract_executed_at: datetime | None = None
    option_period_ends_at: datetime | None = None
    contract_close_by: datetime | None = None
    jv_partner_name: str = ""
    jv_partner_phone: str = ""
    jv_partner_email: str = ""
    jv_fee_split_pct: int | None = None
    hud_fmr_cents: int | None = None
    days_to_close: int | None = None
    early_access_until: datetime | None = None


class DealCreate(BaseModel):
    market_id: str
    list_price_cents: int
    arv_cents: int
    address1: str
    city: str
    state: str = "TX"
    postal_code: str = ""
    beds: int = 0
    baths: float = 0
    sqft: int = 0
    year_built: int | None = None
    occupancy: str = "vacant"
    access: str = "lockbox"
    property_type: str = "SFR"
    description: str = ""
    rehab_low_cents: int = 0
    rehab_high_cents: int = 0
    assignment_fee_cents: int = 0
    lat: float | None = None
    lng: float | None = None
    video_url: str | None = None
    offers_due_at: datetime | None = None
    deal_structure: str = "assignment"
    contract_close_by: datetime | None = None
    contract_executed_at: datetime | None = None
    option_period_ends_at: datetime | None = None
    lockbox_code: str = ""
    status: str = "coming_soon"
    early_access_until: datetime | None = None

    @field_validator("list_price_cents", "arv_cents")
    @classmethod
    def positive_money(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("price and ARV must be positive integer cents")
        if isinstance(v, float):
            raise ValueError("money must be integer cents")
        return v

    @field_validator("beds", "sqft")
    @classmethod
    def non_negative_int(cls, v: int) -> int:
        if v < 0:
            raise ValueError("beds and sqft cannot be negative")
        return v

    @field_validator("baths")
    @classmethod
    def non_negative_baths(cls, v: float) -> float:
        if v < 0:
            raise ValueError("baths cannot be negative")
        return v


class DealPatch(BaseModel):
    list_price_cents: int | None = None
    arv_cents: int | None = None
    rehab_low_cents: int | None = None
    rehab_high_cents: int | None = None
    assignment_fee_cents: int | None = None
    description: str | None = None
    status: str | None = None
    lockbox_code: str | None = None
    contract_close_by: datetime | None = None
    video_url: str | None = None
    offers_due_at: datetime | None = None
    lat: float | None = None
    lng: float | None = None
    occupancy: str | None = None
    access: str | None = None
    early_access_until: datetime | None = None
    property_type: str | None = None
    beds: int | None = None
    baths: float | None = None
    sqft: int | None = None
    year_built: int | None = None
    deal_structure: str | None = None
    contract_executed_at: datetime | None = None
    option_period_ends_at: datetime | None = None

    @field_validator("beds", "sqft")
    @classmethod
    def non_negative_int_patch(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("beds and sqft cannot be negative")
        return v

    @field_validator("baths")
    @classmethod
    def non_negative_baths_patch(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("baths cannot be negative")
        return v


class MapPin(BaseModel):
    id: str
    lat: float
    lng: float
    list_price_cents: int
    price_label: str
    status: str
    reduced: bool = False
    offers_due_at: datetime | None = None


class ManagerOut(BaseModel):
    id: str
    name: str
    phone: str = ""
    email: str = ""
    license: str = ""
    photo_url: str | None = None
    market_ids: list[str] = []


class MarketOut(BaseModel):
    id: str
    slug: str
    name: str
    state: str
    center_lat: float
    center_lng: float
    zoom: int
    timezone: str
    manager: ManagerOut | None = None


def with_mao(admin: DealAdmin) -> DealAdmin:
    admin.mao_cents = mao_cents(admin.arv_cents, admin.rehab_high_cents, admin.assignment_fee_cents)
    return admin
