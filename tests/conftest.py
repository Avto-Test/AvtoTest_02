"""
AUTOTEST Test Fixtures
Configuration for async tests, database, and authentication
"""

import asyncio
from typing import AsyncGenerator, Generator

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from api.auth.router import create_access_token
from core.config import settings
from database.base import Base
from database.session import get_db
from main import app
from models.user import User

# Use a separate test database or the same one (be careful!)
# For this environment, we'll use the configured DB but typically you'd use a test DB
TEST_DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def init_db() -> AsyncGenerator:
    """Initialize database metadata."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Fixture that returns a SQLAlchemy session with a SAVEPOINT.
    This allows each test to run in a transaction that is rolled back.
    """
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(bind=connection, expire_on_commit=False)
        
        yield session
        
        await session.close()
        await transaction.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture for async HTTP client.
    Overrides get_db dependency to use the test session.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


# ========== User Fixtures ==========

@pytest.fixture
async def normal_user(db_session: AsyncSession) -> User:
    """Create a normal user."""
    from  core.security import get_password_hash
    user = User(
        email="user@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def premium_user(db_session: AsyncSession) -> User:
    """Create a premium user."""
    from  core.security import get_password_hash
    from models.subscription import Subscription
    from datetime import datetime, timedelta, timezone
    
    user = User(
        email="premium@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    
    sub = Subscription(
        user_id=user.id,
        plan="premium",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db_session.add(sub)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user."""
    from  core.security import get_password_hash
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("admin123"),
        is_verified=True,
        is_active=True,
        is_admin=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def normal_user_token(normal_user: User) -> str:
    return create_access_token(normal_user.id)


@pytest.fixture
def premium_user_token(premium_user: User) -> str:
    return create_access_token(premium_user.id)


@pytest.fixture
def admin_user_token(admin_user: User) -> str:
    return create_access_token(admin_user.id)
