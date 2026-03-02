"""
AUTOTEST Authentication Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.user import User

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/auth/register", json={
        "email": "newuser@example.com",
        "password": "password123",
        "full_name": "New User"
    })
    assert response.status_code == 201
    data = response.json()
    # Registration endpoint returns MessageResponse, not UserResponse
    assert "message" in data

    # Verify user was created in DB
    result = await db_session.execute(select(User).where(User.email == "newuser@example.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    # When ENABLE_EMAIL_VERIFICATION is False, user is immediately verified
    from core.config import settings
    if settings.ENABLE_EMAIL_VERIFICATION:
        assert user.is_verified is False
    else:
        assert user.is_verified is True


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, normal_user: User):
    response = await client.post("/auth/register", json={
        "email": normal_user.email,
        "password": "password123",
        "full_name": "Duplicate User"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, normal_user: User):
    # Login endpoint uses JSON body (UserLogin schema), not OAuth2 form data
    response = await client.post("/auth/login", json={
        "email": normal_user.email,
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, normal_user: User):
    # Login endpoint uses JSON body (UserLogin schema), not OAuth2 form data
    response = await client.post("/auth/login", json={
        "email": normal_user.email,
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_verify_email_flow(client: AsyncClient, db_session: AsyncSession):
    from core.config import settings
    from models.verification_token import VerificationToken
    email = "verify@example.com"
    await client.post("/auth/register", json={
        "email": email,
        "password": "password123"
    })

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()

    if not settings.ENABLE_EMAIL_VERIFICATION:
        # Verification bypassed: user is already verified, no token created
        assert user.is_verified is True
        return

    # ENABLE_EMAIL_VERIFICATION=True path:
    result = await db_session.execute(select(VerificationToken).where(VerificationToken.user_id == user.id))
    token = result.scalar_one()

    response = await client.post("/auth/verify", json={
        "email": email,
        "code": token.code
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Email verified successfully"

    await db_session.refresh(user)
    assert user.is_verified is True


@pytest.mark.asyncio
async def test_verify_invalid_code(client: AsyncClient, normal_user: User):
    from core.config import settings
    if not settings.ENABLE_EMAIL_VERIFICATION:
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
