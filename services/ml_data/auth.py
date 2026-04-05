from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from core.config import settings

ML_ADMIN_TOKEN_TYPE = "ml_admin"
ML_ADMIN_HEADER = "x-ml-admin-token"


def ml_admin_password_configured() -> bool:
    return bool((settings.ML_ADMIN_PASSWORD or "").strip())


def assert_ml_admin_enabled() -> None:
    if not ml_admin_password_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML admin password is not configured.",
        )


def create_ml_admin_token(*, user_id) -> str:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(hours=max(1, int(settings.ML_ADMIN_SESSION_HOURS or 12)))
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": ML_ADMIN_TOKEN_TYPE,
        "iat": issued_at,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_ml_admin_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

    if payload.get("type") != ML_ADMIN_TOKEN_TYPE:
        return None
    return payload


def validate_ml_admin_password(password: str) -> None:
    assert_ml_admin_enabled()
    if not secrets.compare_digest(password.strip(), settings.ML_ADMIN_PASSWORD.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ML admin password.",
        )


def require_ml_admin_session(request: Request, *, user_id) -> str:
    assert_ml_admin_enabled()
    token = request.headers.get(ML_ADMIN_HEADER, "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ML admin session required.",
        )

    payload = verify_ml_admin_token(token)
    if payload is None or payload.get("sub") != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ML admin session is invalid or expired.",
        )
    return token
