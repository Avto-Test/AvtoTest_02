"""
AUTOTEST Configuration
Environment variables management using Pydantic Settings
"""

import os
from functools import lru_cache
from pathlib import Path

from typing import Any, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://165.232.160.172:3000",
    "https://165.232.160.172:3000",
]


class Settings(BaseSettings):
    """Application settings."""
    
    # App
    APP_NAME: str = "AUTOTEST"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False # Default to False for production safety
    ENABLE_EMAIL_VERIFICATION: bool = True
    
    # Email (Required in Production)
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USERNAME: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    EMAIL_TIMEOUT_SECONDS: float = 12.0
    RESEND_API_KEY: str = ""
    RESEND_KEY: str = ""
    # SMTP aliases used by some deployment panels/secrets
    SMTP_HOST: str = ""
    SMTP_PORT: int | None = None
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    
    # Security
    # SECRET_KEY must be a long random string in production.
    # It is MANDATORY if DEBUG=False.
    SECRET_KEY: str = "" 
    # Match the frontend's persisted 7-day session until refresh tokens exist.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # CORS
    ALLOWED_ORIGINS: Union[list[str], str] = DEFAULT_ALLOWED_ORIGINS

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        raise ValueError("DEBUG must be a valid boolean-like value")

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        origins: list[str]
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                origins = [v]
            else:
                origins = [str(item).strip() for item in v if str(item).strip()]
        else:
            raise ValueError(v)

        merged = []
        seen = set()
        for origin in [*origins, *DEFAULT_ALLOWED_ORIGINS]:
            if origin not in seen:
                merged.append(origin)
                seen.add(origin)
        return merged
    
    # Payments (Legacy Stripe)
    # Retained for backward compatibility.
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Payments (TSPay)
    TSPAY_API_BASE_URL: str = "https://tspay.uz/api/v1"
    # New TsPay contract:
    # POST /transactions/create/ body: { amount, access_token, ... }
    TSPAY_CREATE_TRANSACTION_PATH: str = "/transactions/create/"
    # GET /transactions/{cheque_id}/?access_token=...
    TSPAY_TRANSACTION_STATUS_PATH_TEMPLATE: str = "/transactions/{cheque_id}/"
    TSPAY_ACCESS_TOKEN: str = ""
    # Alias from some integrations/docs.
    TSPAY_MERCHANT_ACCESS_TOKEN: str = ""
    # Additional alias found in some merchant docs.
    TSPAY_MERCHANT_TOKEN: str = ""
    # Optional alias used by some merchant dashboards/docs.
    TSPAY_MERCHANT_KEY: str = ""
    # Optional merchant account credentials (kept for ops metadata/audits).
    TSPAY_MERCHANT_EMAIL: str = ""
    TSPAY_MERCHANT_PASSWORD: str = ""
    TSPAY_REQUIRE_WEBHOOK_SIGNATURE: bool = False
    # Legacy aliases kept for backward compatibility.
    TSPAY_CREATE_SESSION_PATH: str = "/transactions/create/"
    TSPAY_API_KEY: str = ""
    TSPAY_MERCHANT_ID: str = ""
    TSPAY_WEBHOOK_SECRET: str = ""
    TSPAY_WEBHOOK_TOLERANCE_SECONDS: int = 300
    TSPAY_REQUEST_TIMEOUT_SECONDS: float = 10.0
    # Legacy alias (ms) used in earlier .env samples.
    TSPAY_REQUEST_TIMEOUT_MS: int | None = None

    PREMIUM_PRICE_USD: int = 10
    # Fallback checkout amount in UZS (expressed in tiyin-style cents, 100 = 1 UZS).
    PREMIUM_PRICE_UZS: int = 100_000
    # Legacy USD plan compatibility rate used to normalize checkout display/charges into UZS.
    USD_TO_UZS_RATE: int = 13_000
    FRONTEND_SUCCESS_URL: str = "http://localhost:3000/payment/success"
    FRONTEND_CANCEL_URL: str = "http://localhost:3000/payment/cancel"
    # Legacy aliases for redirect urls.
    TSPAY_SUCCESS_URL: str = ""
    TSPAY_CANCEL_URL: str = ""

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        # Email aliases fallback (no-op if EMAIL_* already explicitly configured).
        if not self.EMAIL_HOST and self.SMTP_HOST:
            self.EMAIL_HOST = self.SMTP_HOST
        if (self.EMAIL_PORT in (0, None)) and self.SMTP_PORT:
            self.EMAIL_PORT = int(self.SMTP_PORT)
        if not self.EMAIL_USERNAME and self.SMTP_USERNAME:
            self.EMAIL_USERNAME = self.SMTP_USERNAME
        if not self.EMAIL_PASSWORD and self.SMTP_PASSWORD:
            self.EMAIL_PASSWORD = self.SMTP_PASSWORD
        if not self.EMAIL_FROM and self.SMTP_FROM:
            self.EMAIL_FROM = self.SMTP_FROM

        if not self.TSPAY_ACCESS_TOKEN and self.TSPAY_MERCHANT_ACCESS_TOKEN:
            self.TSPAY_ACCESS_TOKEN = self.TSPAY_MERCHANT_ACCESS_TOKEN
        if not self.TSPAY_ACCESS_TOKEN and self.TSPAY_MERCHANT_TOKEN:
            self.TSPAY_ACCESS_TOKEN = self.TSPAY_MERCHANT_TOKEN

        if (
            self.TSPAY_REQUEST_TIMEOUT_MS is not None
            and "TSPAY_REQUEST_TIMEOUT_SECONDS" not in os.environ
            and self.TSPAY_REQUEST_TIMEOUT_MS > 0
        ):
            self.TSPAY_REQUEST_TIMEOUT_SECONDS = max(self.TSPAY_REQUEST_TIMEOUT_MS / 1000.0, 1.0)

        if not self.FRONTEND_SUCCESS_URL and self.TSPAY_SUCCESS_URL:
            self.FRONTEND_SUCCESS_URL = self.TSPAY_SUCCESS_URL
        if not self.FRONTEND_CANCEL_URL and self.TSPAY_CANCEL_URL:
            self.FRONTEND_CANCEL_URL = self.TSPAY_CANCEL_URL

        if "example" in (self.TSPAY_API_BASE_URL or "").lower():
            self.TSPAY_API_BASE_URL = "https://tspay.uz/api/v1"

        if not self.EMAIL_FROM and self.EMAIL_USERNAME:
            self.EMAIL_FROM = self.EMAIL_USERNAME

        if not self.RESEND_API_KEY and self.RESEND_KEY:
            self.RESEND_API_KEY = self.RESEND_KEY
        if not self.RESEND_KEY and self.RESEND_API_KEY:
            self.RESEND_KEY = self.RESEND_API_KEY

        if not self.DEBUG:
            if not self.SECRET_KEY:
                raise ValueError("SECRET_KEY must be set when DEBUG is False (Production Mode)")
            if self.SECRET_KEY == "your-secret-key-change-in-production":
                raise ValueError("Insecure SECRET_KEY detected in Production Mode")

            if not self.TSPAY_ACCESS_TOKEN and not self.TSPAY_MERCHANT_KEY and not self.TSPAY_API_KEY:
                import logging
                logging.getLogger(__name__).warning(
                    "TSPAY access token is missing. Subscription payments will fail."
                )
        return self

    model_config = SettingsConfigDict(
        env_file=(str(BASE_DIR / ".env"), str(BASE_DIR / ".env.local")),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
