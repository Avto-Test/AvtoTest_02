"""
AUTOTEST Security Module
Password hashing and token helpers.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi.concurrency import run_in_threadpool
from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

TOKEN_TYPE_ACCESS = "access"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


async def verify_password_async(plain_password: str, hashed_password: str) -> bool:
    """Verify password asynchronously in a thread pool."""
    return await run_in_threadpool(verify_password, plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using PBKDF2."""
    return pwd_context.hash(password)


async def get_password_hash_async(password: str) -> str:
    """Hash password asynchronously in a thread pool."""
    return await run_in_threadpool(get_password_hash, password)


def create_access_token(
    user_id: UUID,
    expires_delta: timedelta | None = None,
    *,
    session_id: UUID | None = None,
) -> str:
    """Create a short-lived JWT access token."""
    issued_at = datetime.now(timezone.utc)
    expire = issued_at + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    to_encode: dict[str, Any] = {
        "sub": str(user_id),
        "exp": expire,
        "iat": issued_at,
        "jti": uuid4().hex,
        "type": TOKEN_TYPE_ACCESS,
    }
    if session_id is not None:
        to_encode["sid"] = str(session_id)

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token_payload(token: str) -> dict[str, Any] | None:
    """Decode an access token and validate its type claim."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

    if payload.get("type") != TOKEN_TYPE_ACCESS:
        return None
    return payload


def decode_access_token(token: str) -> str | None:
    """Decode a JWT access token into a user id string."""
    payload = decode_access_token_payload(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    return user_id if isinstance(user_id, str) else None


def generate_refresh_token() -> str:
    """Generate a high-entropy opaque refresh token."""
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """Hash refresh tokens before storage."""
    return hashlib.sha256(f"{SECRET_KEY}:{token}".encode("utf-8")).hexdigest()
