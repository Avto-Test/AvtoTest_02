"""
AUTOTEST Auth Router
Authentication endpoints for register, login, verification, and session rotation.
"""

import asyncio
import json
import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from urllib.parse import urlencode
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from google.auth.exceptions import GoogleAuthError, TransportError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.schemas import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
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
    decode_access_token_payload,
    generate_refresh_token,
    get_password_hash_async,
    hash_refresh_token,
    verify_password_async,
)
from database.session import get_db
from models.pending_registration import PendingRegistration
from models.refresh_session import RefreshSession
from models.driving_instructor import DrivingInstructor
from models.driving_school import DrivingSchool
from models.subscription import Subscription
from models.user import User
from models.verification_token import VerificationToken
from services.gamification.rewards import award_daily_login
from services.subscriptions.lifecycle import enforce_subscription_status

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"

VERIFICATION_CODE_EXPIRE_MINUTES = 15
PASSWORD_RESET_CODE_EXPIRE_MINUTES = 15
PENDING_REGISTRATION_EXPIRE_MINUTES = 15
TOKEN_TYPE_EMAIL_VERIFICATION = "email_verification"
TOKEN_TYPE_PASSWORD_RESET = "password_reset"
GOOGLE_HTTP_TIMEOUT_SECONDS = 5


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return str(random.randint(100000, 999999))


def _should_bypass_email_verification() -> bool:
    return not settings.REQUIRE_EMAIL_VERIFICATION


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autentifikatsiya ma'lumotlari tasdiqlanmadi",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _database_unavailable_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Ma'lumotlar bazasi tayyor emas. Administrator `alembic upgrade head` ishga tushirishi kerak.",
    )


def _set_auth_cookies(response: Response, token_pair: Token) -> None:
    # secure=False vaqtinchalik: prod nginx hozir HTTP. HTTPS yoqilganidan keyin True ga o'tkazish kerak.
    secure = False
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=token_pair.access_token,
        max_age=token_pair.access_token_expires_in,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token_pair.refresh_token,
        max_age=token_pair.refresh_token_expires_in,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")


def _resolve_access_token(request: Request) -> str | None:
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer ") :].strip()
        if token:
            return token

    cookie_token = request.cookies.get(ACCESS_COOKIE_NAME)
    return cookie_token.strip() if cookie_token else None


def _resolve_refresh_token(request: Request) -> str | None:
    cookie_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if cookie_token and cookie_token.strip():
        return cookie_token.strip()
    return None


def _get_request_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop[:64]

    if request.client and request.client.host:
        return request.client.host[:64]
    return None


def _get_request_user_agent(request: Request) -> str | None:
    user_agent = request.headers.get("user-agent", "").strip()
    return user_agent[:512] if user_agent else None


def _log_auth_event(
    level: int,
    *,
    event: str,
    user_id: str | None = None,
    email: str | None = None,
    session_id: str | None = None,
    family_id: str | None = None,
    ip_address: str | None = None,
    error: str | None = None,
) -> None:
    payload: dict[str, str] = {"event": event}
    if user_id:
        payload["user_id"] = user_id
    if email:
        payload["email"] = email
    if session_id:
        payload["session_id"] = session_id
    if family_id:
        payload["family_id"] = family_id
    if ip_address:
        payload["ip_address"] = ip_address
    if error:
        payload["error"] = error
    logger.log(level, "auth_event %s", json.dumps(payload, sort_keys=True))


async def _send_email_with_timeout(
    sender: Callable[..., bool],
    *args: Any,
) -> bool:
    """Run email sender in thread with hard timeout to avoid API hangs."""
    timeout_seconds = max(float(settings.EMAIL_TIMEOUT_SECONDS or 0), 3.0) + 2.0
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(sender, *args),
            timeout=timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.error("Email send timed out using sender=%s", getattr(sender, "__name__", "unknown"))
        return False
    except Exception as exc:
        logger.error("Email send failed using sender=%s: %s", getattr(sender, "__name__", "unknown"), exc)
        return False


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


async def _activate_pending_registration_user(
    *,
    db: AsyncSession,
    email: str,
    pending: PendingRegistration,
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
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
    return user


async def _create_refresh_session(
    *,
    db: AsyncSession,
    user: User,
    request: Request,
    family_id: UUID | None = None,
) -> tuple[str, RefreshSession]:
    refresh_token = generate_refresh_token()
    refresh_session = RefreshSession(
        user_id=user.id,
        family_id=family_id or uuid4(),
        token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=_get_request_user_agent(request),
        ip_address=_get_request_ip(request),
    )
    db.add(refresh_session)
    await db.flush()
    return refresh_token, refresh_session


def _build_token_response(*, user_id: UUID, refresh_token: str, session_id: UUID) -> Token:
    access_ttl = max(int(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60), 60)
    refresh_ttl = max(int(settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60), 3600)
    return Token(
        access_token=create_access_token(user_id=user_id, session_id=session_id),
        refresh_token=refresh_token,
        token_type="bearer",
        access_token_expires_in=access_ttl,
        refresh_token_expires_in=refresh_ttl,
    )


async def _issue_auth_tokens(
    *,
    db: AsyncSession,
    user: User,
    request: Request,
    family_id: UUID | None = None,
) -> tuple[Token, RefreshSession]:
    refresh_token, refresh_session = await _create_refresh_session(
        db=db,
        user=user,
        request=request,
        family_id=family_id,
    )
    return (
        _build_token_response(
            user_id=user.id,
            refresh_token=refresh_token,
            session_id=refresh_session.id,
        ),
        refresh_session,
    )


def _get_google_backend_client_id() -> str:
    return (settings.BACKEND_GOOGLE_CLIENT_ID or settings.GOOGLE_CLIENT_ID).strip()


def _google_http_request() -> Callable[..., Any]:
    request = google_requests.Request()

    def request_with_timeout(*args: Any, **kwargs: Any) -> Any:
        kwargs.setdefault("timeout", GOOGLE_HTTP_TIMEOUT_SECONDS)
        return request(*args, **kwargs)

    return request_with_timeout


def _looks_like_jwt(credential: str) -> bool:
    return credential.count(".") == 2


def _google_verification_unavailable_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Google tokenini tekshirish vaqtincha imkonsiz. Qayta urinib ko'ring.",
    )


async def _verify_google_credential(credential: str) -> dict[str, str]:
    client_id = _get_google_backend_client_id()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth client ID sozlanmagan",
        )

    if _looks_like_jwt(credential):
        try:
            token_info = await asyncio.to_thread(
                id_token.verify_oauth2_token,
                credential,
                _google_http_request(),
                client_id,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token yaroqsiz",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        except (GoogleAuthError, TransportError) as exc:
            logger.warning("Google ID token verification transport failed: %s", exc)
            raise _google_verification_unavailable_exception() from exc
    else:
        token_info = await _verify_google_access_token(credential=credential, client_id=client_id)

    email = str(token_info.get("email") or "").strip().lower()
    google_sub_id = str(token_info.get("sub") or "").strip()
    email_verified = token_info.get("email_verified")
    if email_verified not in (True, "true", "True", "1", 1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google email tasdiqlanmagan",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not email or not google_sub_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token to'liq profil ma'lumotlarini bermadi",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "email": email,
        "given_name": str(token_info.get("given_name") or "").strip(),
        "family_name": str(token_info.get("family_name") or "").strip(),
        "picture": str(token_info.get("picture") or "").strip(),
        "google_sub_id": google_sub_id,
    }


def _google_request_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    response = google_requests.Request()(
        url=url,
        method="GET",
        headers=headers or {},
        timeout=GOOGLE_HTTP_TIMEOUT_SECONDS,
    )
    if response.status != 200:
        raise ValueError("Google token verification failed")
    payload = json.loads(response.data.decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Google response was not a JSON object")
    return payload


def _google_token_audience_candidates(token_info: dict[str, Any]) -> set[str]:
    audience_keys = ("aud", "audience", "issued_to", "azp")
    return {
        str(token_info.get(key) or "").strip()
        for key in audience_keys
        if str(token_info.get(key) or "").strip()
    }


async def _verify_google_access_token(*, credential: str, client_id: str) -> dict[str, Any]:
    try:
        token_info = await asyncio.to_thread(
            _google_request_json,
            f"https://oauth2.googleapis.com/tokeninfo?{urlencode({'access_token': credential})}",
        )
        audience_candidates = _google_token_audience_candidates(token_info)
        logger.info(
            "Google access tokeninfo received: keys=%s audience_match=%s",
            sorted(token_info.keys()),
            client_id in audience_candidates,
        )
        if client_id not in audience_candidates:
            logger.warning(
                "Google access token audience mismatch: keys=%s audience_candidates=%s",
                sorted(token_info.keys()),
                sorted(audience_candidates),
            )
            raise ValueError("Google token audience mismatch")

        profile = await asyncio.to_thread(
            _google_request_json,
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {"Authorization": f"Bearer {credential}"},
        )
        logger.info(
            "Google userinfo received: has_email=%s has_sub=%s email_verified=%s",
            bool(str(profile.get("email") or "").strip()),
            bool(str(profile.get("sub") or "").strip()),
            profile.get("email_verified"),
        )
    except (ValueError, GoogleAuthError, TransportError) as exc:
        if isinstance(exc, (GoogleAuthError, TransportError)):
            logger.warning("Google access token verification transport failed: %s", exc)
            raise _google_verification_unavailable_exception() from exc
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token yaroqsiz",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return profile


async def _revoke_session(
    session: RefreshSession,
    *,
    reason: str,
    revoked_at: datetime | None = None,
) -> None:
    session.revoked_at = revoked_at or datetime.now(timezone.utc)
    session.revoked_reason = reason


async def _revoke_family_sessions(
    *,
    db: AsyncSession,
    family_id: UUID,
    reason: str,
) -> None:
    result = await db.execute(
        select(RefreshSession).where(
            RefreshSession.family_id == family_id,
            RefreshSession.revoked_at.is_(None),
        )
    )
    revoked_at = datetime.now(timezone.utc)
    for session in result.scalars().all():
        await _revoke_session(session, reason=reason, revoked_at=revoked_at)


async def _revoke_user_refresh_sessions(
    *,
    db: AsyncSession,
    user_id: UUID,
    reason: str,
) -> None:
    result = await db.execute(
        select(RefreshSession).where(
            RefreshSession.user_id == user_id,
            RefreshSession.revoked_at.is_(None),
        )
    )
    revoked_at = datetime.now(timezone.utc)
    for session in result.scalars().all():
        await _revoke_session(session, reason=reason, revoked_at=revoked_at)


async def resolve_user_from_access_token(
    token: str,
    *,
    db: AsyncSession,
    include_subscription: bool = True,
) -> User | None:
    payload = decode_access_token_payload(token)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        return None

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return None

    session_id_raw = payload.get("sid")
    if session_id_raw is not None:
        try:
            session_uuid = UUID(str(session_id_raw))
        except ValueError:
            return None

        session_result = await db.execute(
            select(RefreshSession).where(
                RefreshSession.id == session_uuid,
                RefreshSession.user_id == user_uuid,
            )
        )
        refresh_session = session_result.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if (
            refresh_session is None
            or refresh_session.revoked_at is not None
            or refresh_session.expires_at <= now
        ):
            return None

    stmt = select(User).where(User.id == user_uuid)
    if include_subscription:
        stmt = stmt.options(selectinload(User.subscription))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a bearer token or access cookie."""
    token = _resolve_access_token(request)
    credentials_exception = _credentials_exception()
    if not token:
        raise credentials_exception

    try:
        user = await resolve_user_from_access_token(token, db=db, include_subscription=True)
        if user is None:
            raise credentials_exception
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Foydalanuvchi faol emas",
            )
        await enforce_subscription_status(user=user, db=db)
        return user
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Unexpected error in get_current_user: %s", exc)
        raise credentials_exception


async def _build_current_user_payload(
    *,
    db: AsyncSession,
    current_user: User,
    award_login: bool = False,
) -> dict:
    if award_login:
        await award_daily_login(db, current_user.id)

    instructor_result = await db.execute(
        select(DrivingInstructor.id).where(DrivingInstructor.user_id == current_user.id)
    )
    school_result = await db.execute(
        select(DrivingSchool.id).where(DrivingSchool.owner_user_id == current_user.id)
    )
    from core.rbac import get_effective_role_names

    roles = await get_effective_role_names(current_user, db)
    subscription = current_user.subscription
    is_premium = subscription.is_active if subscription is not None else current_user.is_premium
    subscription_expires_at = (
        subscription.expires_at if subscription is not None else current_user.subscription_expires_at
    )
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
        "roles": roles,
        "is_premium": is_premium,
        "subscription_expires_at": subscription_expires_at,
        "has_instructor_profile": instructor_result.scalar_one_or_none() is not None,
        "has_school_profile": school_result.scalar_one_or_none() is not None,
        "created_at": current_user.created_at,
    }


@router.get("/me", response_model=UserMeResponse)
async def get_my_profile_via_auth(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Backward-compatible profile endpoint."""
    payload = await _build_current_user_payload(
        db=db,
        current_user=current_user,
        award_login=True,
    )
    await db.commit()
    return payload


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Register a new user and send verification email."""
    normalized_email = user_data.email.strip().lower()
    bypass_email_verification = _should_bypass_email_verification()
    result = await db.execute(select(User).where(User.email == normalized_email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu email allaqachon ro'yxatdan o'tgan",
            )

        hashed_password = await get_password_hash_async(user_data.password)
        if bypass_email_verification:
            existing_user.hashed_password = hashed_password
            existing_user.is_verified = True
            existing_user.is_active = True
            await db.commit()
            logger.info("Email verification bypassed for %s", normalized_email)
            return MessageResponse(message="Ro'yxatdan o'tish muvaffaqiyatli yakunlandi")

        code = await _create_token(
            db=db,
            user_id=existing_user.id,
            token_type=TOKEN_TYPE_EMAIL_VERIFICATION,
            expires_minutes=VERIFICATION_CODE_EXPIRE_MINUTES,
        )

        email_sent = await _send_email_with_timeout(send_verification_email, normalized_email, code)
        if not email_sent:
            logger.error("Failed to send verification email during re-registration for %s", normalized_email)

        existing_user.hashed_password = hashed_password
        existing_user.is_active = False
        await db.commit()

        return MessageResponse(
            message=(
                "Tasdiqlash kodi emailingizga yuborildi"
                if email_sent
                else "Akkaunt yaratildi. Tasdiqlash kodini qayta yuboring."
            )
        )

    hashed_password = await get_password_hash_async(user_data.password)

    if bypass_email_verification:
        new_user = User(
            email=normalized_email,
            hashed_password=hashed_password,
            is_verified=True,
            is_active=True,
        )
        db.add(new_user)
        await db.commit()
        logger.info("Email verification bypassed for %s", normalized_email)
        return MessageResponse(message="Ro'yxatdan o'tish muvaffaqiyatli yakunlandi")

    if settings.ENABLE_EMAIL_VERIFICATION:
        code = await _create_or_refresh_pending_registration(
            db=db,
            email=normalized_email,
            hashed_password=hashed_password,
        )

        email_sent = await _send_email_with_timeout(send_verification_email, normalized_email, code)
        if not email_sent:
            logger.error("Failed to send verification email during registration for %s", normalized_email)

        await db.commit()
        return MessageResponse(
            message=(
                "Tasdiqlash kodi emailingizga yuborildi"
                if email_sent
                else "Akkaunt yaratildi. Tasdiqlash kodini qayta yuboring."
            )
        )

    new_user = User(
        email=normalized_email,
        hashed_password=hashed_password,
        is_verified=True,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    return MessageResponse(message="Ro'yxatdan o'tish muvaffaqiyatli yakunlandi")


@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Login with email and password and issue a rotated session pair."""
    normalized_email = user_data.email.strip().lower()
    request_ip = _get_request_ip(request)
    invalid_credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email yoki parol noto'g'ri",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        result = await db.execute(select(User).where(User.email == normalized_email))
        user = result.scalar_one_or_none()
        pending_result = await db.execute(
            select(PendingRegistration).where(PendingRegistration.email == normalized_email)
        )
        pending = pending_result.scalar_one_or_none()

        if user is None and pending is not None and _should_bypass_email_verification():
            user = await _activate_pending_registration_user(
                db=db,
                email=normalized_email,
                pending=pending,
            )

        if user is None:
            _log_auth_event(
                logging.WARNING,
                event="login_failed",
                email=normalized_email,
                ip_address=request_ip,
                error="invalid_credentials",
            )
            raise invalid_credentials_error

        if not await verify_password_async(user_data.password, user.hashed_password):
            _log_auth_event(
                logging.WARNING,
                event="login_failed",
                user_id=str(user.id),
                email=normalized_email,
                ip_address=request_ip,
                error="invalid_credentials",
            )
            raise invalid_credentials_error

        if _should_bypass_email_verification() and not user.is_verified:
            user.is_verified = True
            if not user.is_active:
                user.is_active = True
            logger.info("Email verification bypassed during login for %s", normalized_email)

        if not user.is_active:
            _log_auth_event(
                logging.WARNING,
                event="login_failed",
                user_id=str(user.id),
                email=normalized_email,
                ip_address=request_ip,
                error="inactive_user",
            )
            raise invalid_credentials_error

        token_pair, refresh_session = await _issue_auth_tokens(db=db, user=user, request=request)
        await db.commit()
        _set_auth_cookies(response, token_pair)
        _log_auth_event(
            logging.INFO,
            event="login_success",
            user_id=str(user.id),
            email=normalized_email,
            session_id=str(refresh_session.id),
            family_id=str(refresh_session.family_id),
            ip_address=request_ip,
        )
        return token_pair
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.error("Database error during login for %s: %s", normalized_email, exc)
        raise _database_unavailable_exception() from exc


@router.post("/google")
async def google_auth(
    google_data: GoogleAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Authenticate with a Google ID token and issue AUTOTEST tokens."""
    google_profile = await _verify_google_credential(google_data.credential)
    normalized_email = google_profile["email"]
    google_sub_id = google_profile["google_sub_id"]
    full_name = " ".join(
        part for part in [google_profile["given_name"], google_profile["family_name"]] if part
    ).strip()
    request_ip = _get_request_ip(request)

    try:
        google_user_result = await db.execute(
            select(User)
            .where(User.google_id == google_sub_id)
            .options(selectinload(User.subscription))
        )
        google_user = google_user_result.scalar_one_or_none()
        if google_user is not None and google_user.email.lower() != normalized_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu Google hisob boshqa email bilan bog'langan",
            )

        if google_user is None:
            result = await db.execute(
                select(User)
                .where(User.email == normalized_email)
                .options(selectinload(User.subscription))
            )
            user = result.scalar_one_or_none()
        else:
            user = google_user

        if user is None:
            user = User(
                email=normalized_email,
                hashed_password=await get_password_hash_async(generate_refresh_token()),
                full_name=full_name or None,
                google_id=google_sub_id,
                auth_provider="google",
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            await db.flush()
            db.add(
                Subscription(
                    user_id=user.id,
                    plan="free",
                    status="inactive",
                    provider="google",
                )
            )
        else:
            if user.google_id and user.google_id != google_sub_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Bu email boshqa Google hisob bilan bog'langan",
                )

            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Foydalanuvchi faol emas",
                )

            user.google_id = google_sub_id
            user.auth_provider = "google"
            user.is_verified = True
            if not user.full_name and full_name:
                user.full_name = full_name
            if user.subscription is None:
                db.add(
                    Subscription(
                        user_id=user.id,
                        plan="free",
                        status="inactive",
                        provider="google",
                    )
                )

        pending_result = await db.execute(
            select(PendingRegistration).where(PendingRegistration.email == normalized_email)
        )
        pending = pending_result.scalar_one_or_none()
        if pending is not None:
            await db.delete(pending)

        await db.flush()
        refreshed_result = await db.execute(
            select(User)
            .where(User.id == user.id)
            .options(selectinload(User.subscription))
        )
        refreshed_user = refreshed_result.scalar_one()
        await enforce_subscription_status(user=refreshed_user, db=db)
        token_pair, refresh_session = await _issue_auth_tokens(
            db=db,
            user=refreshed_user,
            request=request,
        )
        user_payload = await _build_current_user_payload(
            db=db,
            current_user=refreshed_user,
            award_login=False,
        )
        await db.commit()
        _log_auth_event(
            logging.INFO,
            event="google_login_success",
            user_id=str(refreshed_user.id),
            email=normalized_email,
            session_id=str(refresh_session.id),
            family_id=str(refresh_session.family_id),
            ip_address=request_ip,
        )
        return {
            **token_pair.model_dump(),
            "user": user_payload,
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.error("Database error during Google login for %s: %s", normalized_email, exc)
        raise _database_unavailable_exception() from exc


@router.post("/refresh", response_model=Token)
async def refresh_session(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Rotate refresh tokens and detect reuse attempts."""
    refresh_token = _resolve_refresh_token(request)
    if not refresh_token:
        raise _credentials_exception()

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(RefreshSession)
        .where(RefreshSession.token_hash == hash_refresh_token(refresh_token))
        .options(selectinload(RefreshSession.user))
    )
    refresh_session = result.scalar_one_or_none()
    if refresh_session is None:
        raise _credentials_exception()

    if refresh_session.revoked_at is not None:
        if refresh_session.revoked_reason == "rotated":
            _log_auth_event(
                logging.WARNING,
                event="refresh_reuse_detected",
                user_id=str(refresh_session.user_id),
                session_id=str(refresh_session.id),
                family_id=str(refresh_session.family_id),
                ip_address=_get_request_ip(request),
                error="rotated_token_reused",
            )
            await _revoke_family_sessions(
                db=db,
                family_id=refresh_session.family_id,
                reason="reuse_detected",
            )
            await db.commit()
        raise _credentials_exception()

    if refresh_session.expires_at <= now:
        await _revoke_session(refresh_session, reason="expired", revoked_at=now)
        await db.commit()
        raise _credentials_exception()

    user = refresh_session.user
    if user is None or not user.is_active:
        await _revoke_session(refresh_session, reason="user_inactive", revoked_at=now)
        await db.commit()
        raise _credentials_exception()

    refresh_session.last_used_at = now
    token_pair, rotated_session = await _issue_auth_tokens(
        db=db,
        user=user,
        request=request,
        family_id=refresh_session.family_id,
    )
    await _revoke_session(refresh_session, reason="rotated", revoked_at=now)
    refresh_session.replaced_by_session_id = rotated_session.id
    await db.commit()
    _set_auth_cookies(response, token_pair)
    _log_auth_event(
        logging.INFO,
        event="refresh_rotation",
        user_id=str(user.id),
        session_id=str(rotated_session.id),
        family_id=str(rotated_session.family_id),
        ip_address=_get_request_ip(request),
    )
    return token_pair


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Invalidate the presented refresh token."""
    refresh_token = _resolve_refresh_token(request)
    if refresh_token:
        result = await db.execute(
            select(RefreshSession).where(RefreshSession.token_hash == hash_refresh_token(refresh_token))
        )
        refresh_session = result.scalar_one_or_none()
        if refresh_session is not None and refresh_session.revoked_at is None:
            await _revoke_session(refresh_session, reason="logout")
            await db.commit()
            _log_auth_event(
                logging.INFO,
                event="logout_success",
                user_id=str(refresh_session.user_id),
                session_id=str(refresh_session.id),
                family_id=str(refresh_session.family_id),
                ip_address=_get_request_ip(request),
            )

    _clear_auth_cookies(response)
    return MessageResponse(message="Sessiya yopildi")


@router.post("/verify", response_model=Token)
async def verify_email(
    verify_data: VerifyEmail,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Verify email with code and create a hardened session pair."""
    normalized_email = verify_data.email.strip().lower()
    normalized_code = verify_data.code.strip()
    now = datetime.now(timezone.utc)

    pending_result = await db.execute(
        select(PendingRegistration).where(PendingRegistration.email == normalized_email)
    )
    pending = pending_result.scalar_one_or_none()

    if pending is not None:
        if pending.code != normalized_code or pending.code_expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tasdiqlash kodi noto'g'ri yoki muddati tugagan",
            )

        user_result = await db.execute(select(User).where(User.email == normalized_email))
        user = user_result.scalar_one_or_none()
        if user is not None and user.is_verified:
            await db.delete(pending)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email allaqachon tasdiqlangan",
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
        token_pair, _ = await _issue_auth_tokens(db=db, user=user, request=request)
        await db.commit()
        _set_auth_cookies(response, token_pair)
        return token_pair

    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email yoki kod noto'g'ri",
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email allaqachon tasdiqlangan",
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
            detail="Tasdiqlash kodi noto'g'ri yoki muddati tugagan",
        )

    await db.delete(token)
    user.is_verified = True
    user.is_active = True
    token_pair, _ = await _issue_auth_tokens(db=db, user=user, request=request)
    await db.commit()
    _set_auth_cookies(response, token_pair)
    return token_pair


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if _should_bypass_email_verification():
        return MessageResponse(message="Email verification is disabled")

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

        if not await _send_email_with_timeout(send_verification_email, normalized_email, pending.code):
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tasdiqlash kodi yuborilmadi. Email provayder sozlamalarini tekshiring.",
            )
        await db.commit()
        return MessageResponse(message="Tasdiqlash kodi emailingizga yuborildi")

    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user is None:
        return MessageResponse(message="Agar hisob mavjud bo'lsa, tasdiqlash kodi yuborildi")
    if user.is_verified:
        return MessageResponse(message="Email allaqachon tasdiqlangan")

    code = await _create_token(
        db=db,
        user_id=user.id,
        token_type=TOKEN_TYPE_EMAIL_VERIFICATION,
        expires_minutes=VERIFICATION_CODE_EXPIRE_MINUTES,
    )

    if not await _send_email_with_timeout(send_verification_email, normalized_email, code):
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tasdiqlash kodi yuborilmadi. Email provayder sozlamalarini tekshiring.",
        )

    await db.commit()
    return MessageResponse(message="Tasdiqlash kodi emailingizga yuborildi")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    normalized_email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user is None:
        return MessageResponse(message="Agar hisob mavjud bo'lsa, tiklash kodi yuborildi")

    code = await _create_token(
        db=db,
        user_id=user.id,
        token_type=TOKEN_TYPE_PASSWORD_RESET,
        expires_minutes=PASSWORD_RESET_CODE_EXPIRE_MINUTES,
    )

    if not await _send_email_with_timeout(send_password_reset_email, normalized_email, code):
        logger.warning("Password reset email failed for %s, but request will still succeed", normalized_email)

    await db.commit()
    return MessageResponse(message="Agar hisob mavjud bo'lsa, tiklash kodi yuborildi")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    normalized_email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email yoki kod noto'g'ri")

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
            detail="Tiklash kodi noto'g'ri yoki muddati tugagan",
        )

    user.hashed_password = await get_password_hash_async(payload.new_password)
    user.is_active = True
    await db.delete(reset_token)
    await _revoke_user_refresh_sessions(db=db, user_id=user.id, reason="password_reset")
    await db.commit()

    return MessageResponse(message="Parol muvaffaqiyatli yangilandi")
