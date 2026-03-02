"""
AUTOTEST Configuration
Environment variables management using Pydantic Settings
"""

import os
from functools import lru_cache

from typing import Any, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    
    # App
    APP_NAME: str = "AUTOTEST"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False # Default to False for production safety
    ENABLE_EMAIL_VERIFICATION: bool = False
    
    # Email (Required in Production)
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USERNAME: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    
    # Security
    # SECRET_KEY must be a long random string in production.
    # It is MANDATORY if DEBUG=False.
    SECRET_KEY: str = "" 
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # CORS
    ALLOWED_ORIGINS: Union[list[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

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
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
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
    TSPAY_REQUIRE_WEBHOOK_SIGNATURE: bool = False
    # Legacy aliases kept for backward compatibility.
    TSPAY_CREATE_SESSION_PATH: str = "/transactions/create/"
    TSPAY_API_KEY: str = ""
    TSPAY_MERCHANT_ID: str = ""
    TSPAY_WEBHOOK_SECRET: str = ""
    TSPAY_WEBHOOK_TOLERANCE_SECONDS: int = 300
    TSPAY_REQUEST_TIMEOUT_SECONDS: float = 10.0

    PREMIUM_PRICE_USD: int = 10
    FRONTEND_SUCCESS_URL: str = "http://localhost:3000/payment/success"
    FRONTEND_CANCEL_URL: str = "http://localhost:3000/payment/cancel"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if not self.DEBUG:
            if not self.SECRET_KEY:
                raise ValueError("SECRET_KEY must be set when DEBUG is False (Production Mode)")
            if self.SECRET_KEY == "your-secret-key-change-in-production":
                raise ValueError("Insecure SECRET_KEY detected in Production Mode")

            if not self.TSPAY_ACCESS_TOKEN and not self.TSPAY_API_KEY:
                import logging
                logging.getLogger(__name__).warning(
                    "TSPAY access token is missing. Subscription payments will fail."
                )
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
