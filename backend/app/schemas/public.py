from pydantic import BaseModel, ConfigDict


class PublicConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    brand_name: str
    tagline: str | None
    domain: str
    support_phone: str | None
    support_email: str | None
    logo_url: str | None
    footer_legal_name: str | None
    primary_state: str
    mailing_address: str | None
    terms_version: str


class HealthResponse(BaseModel):
    status: str
    db: str
    redis: str


class VersionResponse(BaseModel):
    version: str
    commit: str
    environment: str
