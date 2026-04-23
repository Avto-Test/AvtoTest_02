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
from database.safety import normalize_environment_name, validate_database_target

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
ENVIRONMENT_FILE_MAP = {
    "development": ".env.dev",
    "testing": ".env.test",
    "production": ".env.prod",
}


def _resolve_settings_files() -> tuple[str, ...]:
    """Load the environment-specific dotenv file with safe precedence."""

    explicit_env_file = os.getenv("APP_ENV_FILE", "").strip()
    if explicit_env_file:
        env_file = Path(explicit_env_file)
        if not env_file.is_absolute():
            env_file = BASE_DIR / env_file
        return (str(env_file),)

    environment = normalize_environment_name(os.getenv("ENVIRONMENT"))
    if environment == "testing":
        return (str(BASE_DIR / ENVIRONMENT_FILE_MAP["testing"]),)
    if environment == "production":
        return (str(BASE_DIR / ENVIRONMENT_FILE_MAP["production"]),)

    return (
        str(BASE_DIR / ENVIRONMENT_FILE_MAP["development"]),
        str(BASE_DIR / ".env"),
    )


class Settings(BaseSettings):
    """Application settings."""
    
    # App
    APP_NAME: str = "AUTOTEST"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False # Default to False for production safety
    ENABLE_API_DOCS: bool = True
    ENABLE_EMAIL_VERIFICATION: bool = True
    REQUIRE_EMAIL_VERIFICATION: bool = False
    
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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 20
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest"
    EXPECTED_DATABASE_NAME: str = ""
    BACKUP_DIR: str = str(BASE_DIR / "backups")
    BACKUP_RETENTION_COUNT: int = 14
    PG_DUMP_PATH: str = "pg_dump"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_QUESTION_UPDATE_COMPARISON: bool = False
    USE_PROGRESS_TRACKING_ONLY: bool = False
    DRY_RUN: bool = False
    USE_CANONICAL_ATTEMPT_FINALIZER: bool = False
    SHADOW_ATTEMPT_FLOW_COMPARE: bool = False
    ML_ADMIN_PASSWORD: str = ""
    ML_ADMIN_SESSION_HOURS: int = 12
    ML_ARTIFACTS_DIR: str = str(BASE_DIR / "artifacts" / "ml")

    # Monitoring
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0
    SENTRY_RELEASE: str = ""
    
    # CORS
    ALLOWED_ORIGINS: Union[list[str], str] = DEFAULT_ALLOWED_ORIGINS

    @property
    def normalized_environment(self) -> str:
        return normalize_environment_name(self.ENVIRONMENT)

    @property
    def is_development(self) -> bool:
        return self.normalized_environment == "development"

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
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    import json
                    origins = json.loads(v)
                except Exception:
                    origins = [i.strip() for i in v[1:-1].split(",") if i.strip()]
            else:
                origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            origins = [str(item).strip() for item in v if str(item).strip()]
        else:
            origins = []

        seen = set()
        merged = []
        for origin in [*origins, *DEFAULT_ALLOWED_ORIGINS]:
            if origin and origin not in seen:
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
        self.ENVIRONMENT = self.normalized_environment
        self.EXPECTED_DATABASE_NAME = self.EXPECTED_DATABASE_NAME.strip()

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

        if not self.SENTRY_ENVIRONMENT:
            self.SENTRY_ENVIRONMENT = self.ENVIRONMENT

        if self.ENVIRONMENT == "production" and not self.EXPECTED_DATABASE_NAME:
            raise ValueError("EXPECTED_DATABASE_NAME must be set when ENVIRONMENT=production")

        try:
            validate_database_target(
                self.DATABASE_URL,
                self.ENVIRONMENT,
                self.EXPECTED_DATABASE_NAME or None,
            )
        except RuntimeError as exc:
            raise ValueError(str(exc)) from exc

        if self.ENVIRONMENT == "production" and not self.ENABLE_EMAIL_VERIFICATION:
            raise ValueError("ENABLE_EMAIL_VERIFICATION cannot be disabled when ENVIRONMENT=production")

        if not self.DEBUG:
            if not self.SECRET_KEY:
                raise ValueError("SECRET_KEY must be set when DEBUG is False (Production Mode)")
            if self.SECRET_KEY == "your-secret-key-change-in-production":
                raise ValueError("Insecure SECRET_KEY detected in Production Mode")
            if "*" in self.ALLOWED_ORIGINS:
                raise ValueError("Wildcard ALLOWED_ORIGINS is not allowed in Production Mode")
            insecure_origins = [
                origin
                for origin in self.ALLOWED_ORIGINS
                if origin.startswith("http://")
                and "localhost" not in origin
                and "127.0.0.1" not in origin
            ]
            if insecure_origins:
                raise ValueError(
                    "Insecure ALLOWED_ORIGINS detected in Production Mode: "
                    + ", ".join(insecure_origins)
                )

            if not self.TSPAY_ACCESS_TOKEN and not self.TSPAY_MERCHANT_KEY and not self.TSPAY_API_KEY:
                import logging
                logging.getLogger(__name__).warning(
                    "TSPAY access token is missing. Subscription payments will fail."
                )
        return self

    model_config = SettingsConfigDict(
        env_file=_resolve_settings_files(),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
