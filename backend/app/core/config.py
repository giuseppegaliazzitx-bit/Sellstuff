"""Runtime settings. Every knob is an env var; see `.env.example`."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["local", "dev", "prod"] = "local"
    app_version: str = "dev"
    app_commit: str = "unknown"
    log_level: str = "info"
    sentry_dsn: str = ""

    public_brand_name: str = "Northstar Dispo"
    public_brand_tagline: str = ""
    public_domain: str = "localhost"
    public_support_phone: str = ""
    public_support_email: str = ""
    public_logo_url: str = ""
    public_footer_legal_name: str = ""
    public_primary_state: str = "TX"
    public_mailing_address: str = ""

    require_admin_approval: bool = True
    require_email_verification: str = "auto"
    admin_require_2fa: bool = False
    secret_key: str
    secret_key_previous: str = ""
    jwt_issuer: str = ""
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 14
    cookie_name_prefix: str = ""
    terms_version: str = "2026-08-22"
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = ""

    database_url: str = "sqlite+aiosqlite:///./data/northstar.db"
    redis_url: str = ""
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket_photos: str = "photos"
    s3_bucket_docs: str = "docs"
    local_media_dir: str = "./data/media"

    mail_from: str = ""
    mail_username: str = ""
    mail_password: str = ""
    mail_smtp_host: str = "smtp.gmail.com"
    mail_smtp_port: int = 587
    mail_imap_host: str = "imap.gmail.com"
    mail_imap_port: int = 993
    mail_poll_seconds: int = 60
    mail_daily_limit: int = 450
    mail_rate_per_minute: int = 20

    map_tile_url: str = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    map_sat_tile_url: str = (
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    )
    nominatim_url: str = "https://nominatim.openstreetmap.org"
    nominatim_user_agent: str = "NorthstarDispo/1.0 (contact: support@localhost)"

    photo_max_mb: int = 15
    doc_max_mb: int = 25
    watermark_downloads: bool = False
    early_access_default_hours: int = 0
    video_embed_hosts: str = "youtube.com,youtube-nocookie.com,vimeo.com,matterport.com"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000"
    cookie_secure: bool = False
    image_tag: str = "latest"

    jwt_audience: str = Field(default="northstar", alias="JWT_AUDIENCE")

    @field_validator("secret_key")
    @classmethod
    def secret_key_min_length(cls, value: str) -> str:
        if not value or len(value.encode("utf-8")) < 32:
            raise ValueError("SECRET_KEY is required and must be at least 32 bytes")
        return value

    @field_validator("secret_key_previous")
    @classmethod
    def previous_key_min_length(cls, value: str) -> str:
        if value and len(value.encode("utf-8")) < 32:
            raise ValueError("SECRET_KEY_PREVIOUS must be at least 32 bytes when set")
        return value

    @model_validator(mode="after")
    def prod_requires_postgres(self) -> Settings:
        if self.environment == "prod" and not self.database_url.startswith("postgresql"):
            raise ValueError("ENVIRONMENT=prod requires a postgresql DATABASE_URL")
        if not self.jwt_issuer:
            self.jwt_issuer = self.public_domain
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [part.strip() for part in self.cors_origins.split(",") if part.strip()]

    @property
    def mail_configured(self) -> bool:
        return bool(self.mail_username and self.mail_password)

    @property
    def redis_configured(self) -> bool:
        return bool(self.redis_url)

    @property
    def s3_configured(self) -> bool:
        return bool(self.s3_endpoint)

    def public_config(self) -> dict[str, str | None]:
        return {
            "brand_name": self.public_brand_name,
            "tagline": self.public_brand_tagline or None,
            "domain": self.public_domain,
            "support_phone": self.public_support_phone or None,
            "support_email": self.public_support_email or None,
            "logo_url": self.public_logo_url or None,
            "footer_legal_name": self.public_footer_legal_name or None,
            "primary_state": self.public_primary_state,
            "mailing_address": self.public_mailing_address or None,
            "terms_version": self.terms_version,
        }


def get_settings(**overrides: object) -> Settings:
    """Build Settings without the process-wide cache. Used by tests."""
    return Settings(**overrides)  # type: ignore[arg-type]


@lru_cache
def settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    settings.cache_clear()
