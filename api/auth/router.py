"""
AUTOTEST Auth Router
Authentication endpoints for register, login, and verification
"""

import random
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.schemas import MessageResponse, Token, UserCreate, UserLogin, VerifyEmail
from core.email import send_verification_email
from core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from database.session import get_db
from models.user import User
from models.verification_token import VerificationToken

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Verification code expiration (15 minutes)
VERIFICATION_CODE_EXPIRE_MINUTES = 15


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return str(random.randint(100000, 999999))


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        token: JWT token from Authorization header
        db: Database session
    
    Returns:
        The authenticated User object
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exception
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    
    return user


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Register a new user and send verification email.
    
    Args:
        user_data: User registration data (email, password)
        db: Database session
    
    Returns:
        Message indicating verification email sent
    
    Raises:
        HTTPException: If email already registered
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user (unverified)
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        is_verified=False,
    )
    
    db.add(new_user)
    await db.flush()
    
    # Create verification token
    code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
    
    verification_token = VerificationToken(
        user_id=new_user.id,
        code=code,
        expires_at=expires_at,
        is_used=False,
    )
    
    db.add(verification_token)
    await db.commit()
    
    # Send verification email
    send_verification_email(user_data.email, code)
    
    return MessageResponse(message="Verification code sent to your email")


@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Login with email and password.
    
    Args:
        user_data: User login data (email, password)
        db: Database session
    
    Returns:
        JWT access token
    
    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()
    
    if user is None or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )
    
    # Generate access token
    access_token = create_access_token(user_id=user.id)
    
    return Token(access_token=access_token)


@router.post("/verify", response_model=Token)
async def verify_email(
    verify_data: VerifyEmail,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Verify email with code.
    
    Args:
        verify_data: Email and verification code
        db: Database session
    
    Returns:
        JWT access token on successful verification
    
    Raises:
        HTTPException: If code is invalid or expired
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == verify_data.email))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or code",
        )
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified",
        )
    
    # Find valid verification token
    result = await db.execute(
        select(VerificationToken).where(
            VerificationToken.user_id == user.id,
            VerificationToken.code == verify_data.code,
            VerificationToken.is_used == False,
            VerificationToken.expires_at > datetime.now(timezone.utc),
        )
    )
    token = result.scalar_one_or_none()
    
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )
    
    # Mark token as used and user as verified
    token.is_used = True
    user.is_verified = True
    
    await db.commit()
    
    # Generate access token
    access_token = create_access_token(user_id=user.id)
    
    return Token(access_token=access_token)
