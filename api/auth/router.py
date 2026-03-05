"""
AUTOTEST Auth Router
Authentication endpoints for register, login, and verification
"""

import random
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.schemas import (
    ForgotPasswordRequest,
    MessageResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserLogin,
    VerifyEmail,
)
from api.users.schemas import UserMeResponse
from core.config import settings
from core.email import send_password_reset_email, send_verification_email
from core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash_async,
    verify_password_async,
)
from database.session import get_db
from models.pending_registration import PendingRegistration
from models.user import User
from models.verification_token import VerificationToken
from services.subscriptions.lifecycle import enforce_subscription_status

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Verification code expiration (15 minutes)
VERIFICATION_CODE_EXPIRE_MINUTES = 15
PASSWORD_RESET_CODE_EXPIRE_MINUTES = 15

TOKEN_TYPE_EMAIL_VERIFICATION = "email_verification"
TOKEN_TYPE_PASSWORD_RESET = "password_reset"
PENDING_REGISTRATION_EXPIRE_MINUTES = 15


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return str(random.randint(100000, 999999))


async def _invalidate_tokens(
    *,
    db: AsyncSession,
    user_id: UUID,
    token_type: str,
) -> None:
    result = await db.execute(
        select(VerificationToken).where(
            VerificationToken.user_id == user_id,
            VerificationToken.token_type == token_type,
        )
    )
    for token in result.scalars().all():
        await db.delete(token)


async def _create_token(
    *,
    db: AsyncSession,
    user_id: UUID,
    token_type: str,
    expires_minutes: int,
) -> str:
    await _invalidate_tokens(db=db, user_id=user_id, token_type=token_type)
    code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    db.add(
        VerificationToken(
            user_id=user_id,
            code=code,
            token_type=token_type,
            expires_at=expires_at,
            is_used=False,
        )
    )
    return code


async def _create_or_refresh_pending_registration(
    *,
    db: AsyncSession,
    email: str,
    hashed_password: str,
) -> str:
    now = datetime.now(timezone.utc)
    code = generate_verification_code()
    expires_at = now + timedelta(minutes=PENDING_REGISTRATION_EXPIRE_MINUTES)

    result = await db.execute(select(PendingRegistration).where(PendingRegistration.email == email))
    pending = result.scalar_one_or_none()
    if pending is None:
        db.add(
            PendingRegistration(
                email=email,
                hashed_password=hashed_password,
                code=code,
                code_expires_at=expires_at,
            )
        )
        return code

    pending.hashed_password = hashed_password
    pending.code = code
    pending.code_expires_at = expires_at
    pending.updated_at = now
    return code


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
    
    try:
        user_id = decode_access_token(token)
        if user_id is None:
            raise credentials_exception
            
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            raise credentials_exception
            
        # Use selectinload to eagerly load subscription for is_premium property
        result = await db.execute(
            select(User)
            .where(User.id == user_uuid)
            .options(selectinload(User.subscription))
        )
        user = result.scalar_one_or_none()
        
        if user is None:
            raise credentials_exception
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is inactive",
            )

        await enforce_subscription_status(user=user, db=db)
            
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}")
        raise credentials_exception


@router.get("/me", response_model=UserMeResponse)
async def get_my_profile_via_auth(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Backward-compatible profile endpoint.
    Some frontend flows still query /auth/me.
    """
    return current_user


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
    normalized_email = user_data.email.strip().lower()
    result = await db.execute(select(User).where(User.email == normalized_email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        # Legacy fallback: keep old unverified user flow without breaking existing records.
        hashed_password = await get_password_hash_async(user_data.password)
        existing_user.hashed_password = hashed_password
        existing_user.is_active = False
        code = await _create_token(
            db=db,
            user_id=existing_user.id,
            token_type=TOKEN_TYPE_EMAIL_VERIFICATION,
            expires_minutes=VERIFICATION_CODE_EXPIRE_MINUTES,
        )
        email_sent = await asyncio.to_thread(send_verification_email, normalized_email, code)
        if not email_sent:
            logger.error("Failed to send verification email during registration for %s", normalized_email)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please check your email address or try again later.",
            )
        await db.commit()
        return MessageResponse(message="Verification code sent to email")

    hashed_password = await get_password_hash_async(user_data.password)

    if settings.ENABLE_EMAIL_VERIFICATION:
        code = await _create_or_refresh_pending_registration(
            db=db,
            email=normalized_email,
            hashed_password=hashed_password,
        )

        email_sent = await asyncio.to_thread(send_verification_email, normalized_email, code)
        if not email_sent:
            logger.error("Failed to send verification email during registration for %s", normalized_email)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email. Please check your email address or try again later.",
            )

        await db.commit()
        return MessageResponse(message="Verification code sent to email")

    new_user = User(
        email=normalized_email,
        hashed_password=hashed_password,
        is_verified=True,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    return MessageResponse(message="Registration successful")


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
    normalized_email = user_data.email.strip().lower()

    # Find user by email
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if user is None:
        pending_result = await db.execute(
            select(PendingRegistration).where(PendingRegistration.email == normalized_email)
        )
        pending = pending_result.scalar_one_or_none()
        # If a pending registration exists, account is not yet created/verified.
        # Keep returning 403 so frontend can route users to verification flow.
        if pending is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not await verify_password_async(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Legacy safety: some existing production users may remain unverified/disabled
    # due to incomplete migrations from earlier auth flows.
    # Keep strict verification for new flows, but auto-recover historical active users.
    if settings.ENABLE_EMAIL_VERIFICATION and not user.is_verified and user.is_active:
        user.is_verified = True
        await db.commit()
        await db.refresh(user)

    # Legacy safety: if user is already verified but inactive, recover account.
    if user.is_verified and not user.is_active:
        user.is_active = True
        await db.commit()
        await db.refresh(user)

    if settings.ENABLE_EMAIL_VERIFICATION and not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
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
    normalized_email = verify_data.email.strip().lower()
    normalized_code = verify_data.code.strip()
    now = datetime.now(timezone.utc)

    # New flow: pending registration -> create real account only after verification.
    pending_result = await db.execute(
        select(PendingRegistration).where(PendingRegistration.email == normalized_email)
    )
    pending = pending_result.scalar_one_or_none()

    if pending is not None:
        if pending.code != normalized_code or pending.code_expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code",
            )

        user_result = await db.execute(select(User).where(User.email == normalized_email))
        user = user_result.scalar_one_or_none()
        if user is not None and user.is_verified:
            await db.delete(pending)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified",
            )

        if user is None:
            user = User(
                email=normalized_email,
                hashed_password=pending.hashed_password,
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            await db.flush()
        else:
            user.hashed_password = pending.hashed_password
            user.is_verified = True
            user.is_active = True

        await db.delete(pending)
        await db.commit()

        access_token = create_access_token(user_id=user.id)
        return Token(access_token=access_token)

    # Legacy fallback for historical unverified users.
    result = await db.execute(select(User).where(User.email == normalized_email))
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

    token_result = await db.execute(
        select(VerificationToken).where(
            VerificationToken.user_id == user.id,
            VerificationToken.code == normalized_code,
            VerificationToken.token_type == TOKEN_TYPE_EMAIL_VERIFICATION,
            VerificationToken.is_used == False,
            VerificationToken.expires_at > now,
        )
    )
    token = token_result.scalar_one_or_none()

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    await db.delete(token)
    user.is_verified = True
    user.is_active = True
    await db.commit()

    access_token = create_access_token(user_id=user.id)
    return Token(access_token=access_token)


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if not settings.ENABLE_EMAIL_VERIFICATION:
        return MessageResponse(message="Email verification is disabled")

    normalized_email = payload.email.strip().lower()

    pending_result = await db.execute(
        select(PendingRegistration).where(PendingRegistration.email == normalized_email)
    )
    pending = pending_result.scalar_one_or_none()
    if pending is not None:
        pending.code = generate_verification_code()
        pending.code_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=PENDING_REGISTRATION_EXPIRE_MINUTES
        )
        pending.updated_at = datetime.now(timezone.utc)

        if not await asyncio.to_thread(send_verification_email, normalized_email, pending.code):
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email",
            )
        await db.commit()
        return MessageResponse(message="Verification code sent to email")

    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user is None:
        # Prevent account enumeration
        return MessageResponse(message="If account exists, verification code has been sent")
    if user.is_verified:
        return MessageResponse(message="Email already verified")

    code = await _create_token(
        db=db,
        user_id=user.id,
        token_type=TOKEN_TYPE_EMAIL_VERIFICATION,
        expires_minutes=VERIFICATION_CODE_EXPIRE_MINUTES,
    )

    if not await asyncio.to_thread(send_verification_email, normalized_email, code):
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email",
        )

    await db.commit()
    return MessageResponse(message="Verification code sent to email")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    normalized_email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user is None:
        return MessageResponse(message="If account exists, reset code has been sent")

    code = await _create_token(
        db=db,
        user_id=user.id,
        token_type=TOKEN_TYPE_PASSWORD_RESET,
        expires_minutes=PASSWORD_RESET_CODE_EXPIRE_MINUTES,
    )

    if not await asyncio.to_thread(send_password_reset_email, normalized_email, code):
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reset email",
        )

    await db.commit()
    return MessageResponse(message="If account exists, reset code has been sent")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    normalized_email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or code")

    token_result = await db.execute(
        select(VerificationToken).where(
            VerificationToken.user_id == user.id,
            VerificationToken.code == payload.code,
            VerificationToken.token_type == TOKEN_TYPE_PASSWORD_RESET,
            VerificationToken.is_used == False,
            VerificationToken.expires_at > datetime.now(timezone.utc),
        )
    )
    reset_token = token_result.scalar_one_or_none()
    if reset_token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    user.hashed_password = await get_password_hash_async(payload.new_password)
    user.is_active = True
    await db.delete(reset_token)
    await db.commit()

    return MessageResponse(message="Password reset successful")
