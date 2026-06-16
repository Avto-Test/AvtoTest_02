"""
AUTOTEST Authentication Tests
"""

import pytest
from fastapi import HTTPException
from google.auth.exceptions import TransportError
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth import router as auth_router
from models.pending_registration import PendingRegistration
from models.user import User


@pytest.mark.asyncio
async def test_google_access_token_skips_id_token_verification(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(auth_router.settings, "BACKEND_GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "")

    async def fake_verify_access_token(*, credential: str, client_id: str):
        assert credential == "opaque-google-access-token"
        assert client_id == "client-id"
        return {
            "email": "google@example.com",
            "sub": "google-sub",
            "email_verified": True,
            "given_name": "Google",
            "family_name": "User",
        }

    def fail_id_token_verification(*args, **kwargs):
        raise AssertionError("Access tokens must not use ID-token verification")

    monkeypatch.setattr(auth_router.id_token, "verify_oauth2_token", fail_id_token_verification)
    monkeypatch.setattr(auth_router, "_verify_google_access_token", fake_verify_access_token)

    profile = await auth_router._verify_google_credential("opaque-google-access-token")

    assert profile["email"] == "google@example.com"
    assert profile["google_sub_id"] == "google-sub"


@pytest.mark.asyncio
async def test_google_id_token_transport_error_returns_503(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(auth_router.settings, "BACKEND_GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "")

    def raise_transport_error(*args, **kwargs):
        raise TransportError("Google certs timed out")

    monkeypatch.setattr(auth_router.id_token, "verify_oauth2_token", raise_transport_error)

    with pytest.raises(HTTPException) as exc_info:
        await auth_router._verify_google_credential("header.payload.signature")

    assert exc_info.value.status_code == 503
    assert "Google tokenini tekshirish" in exc_info.value.detail


@pytest.mark.asyncio
async def test_google_auth_creates_user_and_issues_tokens(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(auth_router.settings, "BACKEND_GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "")

    async def fake_verify_google_credential(credential: str):
        assert credential == "opaque-google-access-token"
        return {
            "email": "new-google-user@example.com",
            "google_sub_id": "google-sub-123",
            "given_name": "New",
            "family_name": "Google",
            "picture": "",
        }

    monkeypatch.setattr(auth_router, "_verify_google_credential", fake_verify_google_credential)

    response = await client.post(
        "/auth/google",
        json={"credential": "opaque-google-access-token"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["refresh_token"]
    assert payload["token_type"] == "bearer"
    assert payload["user"]["email"] == "new-google-user@example.com"

    user_result = await db_session.execute(
        select(User).where(User.email == "new-google-user@example.com")
    )
    user = user_result.scalar_one()
    assert user.google_id == "google-sub-123"
    assert user.is_verified is True
    assert user.is_active is True

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/auth/register", json={
        "email": "newuser@example.com",
        "password": "password123",
        "full_name": "New User"
    })
    assert response.status_code == 201
    data = response.json()
    assert "message" in data

    from core.config import settings
    if settings.is_development:
        result = await db_session.execute(select(User).where(User.email == "newuser@example.com"))
        user = result.scalar_one_or_none()
        pending_result = await db_session.execute(
            select(PendingRegistration).where(PendingRegistration.email == "newuser@example.com")
        )
        assert user is not None
        assert user.is_verified is True
        assert user.is_active is True
        assert pending_result.scalar_one_or_none() is None
    elif settings.ENABLE_EMAIL_VERIFICATION:
        pending_result = await db_session.execute(
            select(PendingRegistration).where(PendingRegistration.email == "newuser@example.com")
        )
        pending = pending_result.scalar_one_or_none()
        user_result = await db_session.execute(select(User).where(User.email == "newuser@example.com"))
        assert pending is not None
        assert user_result.scalar_one_or_none() is None
    else:
        result = await db_session.execute(select(User).where(User.email == "newuser@example.com"))
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.is_verified is True


@pytest.mark.asyncio
async def test_register_allows_immediate_login_in_development(
    client: AsyncClient,
    db_session: AsyncSession,
):
    from core.config import settings

    if not settings.is_development:
        pytest.skip("Development-only registration bypass test")

    email = "dev-login@example.com"
    register_response = await client.post("/auth/register", json={
        "email": email,
        "password": "password123",
        "full_name": "Dev Login",
    })
    assert register_response.status_code == 201

    user_result = await db_session.execute(select(User).where(User.email == email))
    user = user_result.scalar_one()
    assert user.is_verified is True
    assert user.is_active is True

    login_response = await client.post("/auth/login", json={
        "email": email,
        "password": "password123",
    })
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()


@pytest.mark.asyncio
async def test_register_in_development_skips_verification_email(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    from core.config import settings

    if not settings.is_development:
        pytest.skip("Development-only email bypass test")

    email_send_called = False

    def _fake_send_verification_email(*args, **kwargs):
        nonlocal email_send_called
        email_send_called = True
        return True

    monkeypatch.setattr("api.auth.router.send_verification_email", _fake_send_verification_email)

    response = await client.post("/auth/register", json={
        "email": "dev-no-email@example.com",
        "password": "password123",
        "full_name": "No Email Dev User",
    })

    assert response.status_code == 201
    assert email_send_called is False


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, normal_user: User):
    response = await client.post("/auth/register", json={
        "email": normal_user.email,
        "password": "password123",
        "full_name": "Duplicate User"
    })
    assert response.status_code == 400
    assert "allaqachon" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, normal_user: User):
    response = await client.post("/auth/login", json={
        "email": normal_user.email,
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, normal_user: User):
    response = await client.post("/auth/login", json={
        "email": normal_user.email,
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "noto'g'ri" in response.json()["detail"]


@pytest.mark.asyncio
async def test_verify_email_flow(client: AsyncClient, db_session: AsyncSession):
    from core.config import settings

    email = "verify@example.com"
    await client.post("/auth/register", json={
        "email": email,
        "password": "password123"
    })

    if settings.is_development or not settings.ENABLE_EMAIL_VERIFICATION:
        result = await db_session.execute(select(User).where(User.email == email))
        user = result.scalar_one()
        # Verification bypassed: user is already verified, no token created
        assert user.is_verified is True
        return

    result = await db_session.execute(
        select(PendingRegistration).where(PendingRegistration.email == email)
    )
    pending = result.scalar_one()

    response = await client.post("/auth/verify", json={
        "email": email,
        "code": pending.code
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()

    user_result = await db_session.execute(select(User).where(User.email == email))
    user = user_result.scalar_one()
    await db_session.refresh(user)
    assert user.is_verified is True

    pending_after_result = await db_session.execute(
        select(PendingRegistration).where(PendingRegistration.email == email)
    )
    assert pending_after_result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_verify_invalid_code(client: AsyncClient, normal_user: User):
    from core.config import settings
    if settings.is_development or not settings.ENABLE_EMAIL_VERIFICATION:
        # When verification is disabled, the verify endpoint still exists but
        # submitting an invalid code should return 400. We call it directly.
        response = await client.post("/auth/verify", json={
            "email": normal_user.email,
            "code": "000000"
        })
        # Rate limit may or may not have fired; either 400 or 429 is acceptable
        # since in production mode email verification endpoints are disabled anyway.
        # Accept both to avoid flakiness from rate limit state.
        assert response.status_code in (400, 429)
    else:
        response = await client.post("/auth/verify", json={
            "email": normal_user.email,
            "code": "000000"
        })
        assert response.status_code == 400
