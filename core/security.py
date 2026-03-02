"""
AUTOTEST Security Module
Password hashing and JWT token handling
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.concurrency import run_in_threadpool

from core.config import settings

# Password hashing configuration
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# JWT configuration
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


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


def create_access_token(user_id: UUID, expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: The user's UUID to encode in the token
        expires_delta: Optional custom expiration time
    
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: dict[str, Any] = {
        "sub": str(user_id),
        "exp": expire,
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> str | None:
    """
    Decode a JWT access token.
    
    Args:
        token: The JWT token string
    
    Returns:
        The user_id (as string) if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        return user_id
    except JWTError:
        return None
