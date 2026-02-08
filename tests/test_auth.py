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
    assert data["email"] == "newuser@example.com"
    
    # Verify in DB
    result = await db_session.execute(select(User).where(User.email == "newuser@example.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.is_verified is False


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
    response = await client.post("/auth/login", data={
        "username": normal_user.email,
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, normal_user: User):
    response = await client.post("/auth/login", data={
        "username": normal_user.email,
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_verify_email_flow(client: AsyncClient, db_session: AsyncSession):
    from models.verification_token import VerificationToken
    # 1. Register
    email = "verify@example.com"
    await client.post("/auth/register", json={
        "email": email,
        "password": "password123"
    })
    
    # 2. Get verification token directly from DB (since email is mocked)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    
    result = await db_session.execute(select(VerificationToken).where(VerificationToken.user_id == user.id))
    token = result.scalar_one()
    
    # 3. Verify
    response = await client.post("/auth/verify", json={
        "email": email,
        "code": token.code
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Email verified successfully"
    
    # 4. Check status
    await db_session.refresh(user)
    assert user.is_verified is True


@pytest.mark.asyncio
async def test_verify_invalid_code(client: AsyncClient, normal_user: User):
    response = await client.post("/auth/verify", json={
        "email": normal_user.email,
        "code": "000000"
    })
    assert response.status_code == 400
