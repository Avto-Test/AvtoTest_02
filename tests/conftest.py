"""
AUTOTEST Test Fixtures
Configuration for async tests, database, and authentication
"""

import os
from pathlib import Path
from typing import AsyncGenerator

import asyncpg
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from database.safety import (
    derive_test_database_url,
    is_safe_test_database_name,
    validate_database_target,
)

os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("APP_ENV_FILE", ".env.test")

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_local_database_url() -> str:
    for candidate in (PROJECT_ROOT / ".env.local", PROJECT_ROOT / ".env"):
        if not candidate.exists():
            continue

        for raw_line in candidate.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == "DATABASE_URL" and value.strip():
                return value.strip()
    return ""


def _prepare_test_database_environment() -> str:
    explicit_test_url = os.getenv("TEST_DATABASE_URL", "").strip()
    if explicit_test_url:
        validate_database_target(explicit_test_url, "testing")
        test_database_url = explicit_test_url
    else:
        base_database_url = os.getenv("DATABASE_URL", "").strip()
        if not base_database_url:
            base_database_url = _load_local_database_url()
        if not base_database_url:
            base_database_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/autotest_test"
        test_database_url = derive_test_database_url(base_database_url)
        validate_database_target(test_database_url, "testing")

    parsed = make_url(test_database_url)
    os.environ["DATABASE_URL"] = test_database_url
    os.environ["TEST_DATABASE_URL"] = test_database_url
    if parsed.database:
        os.environ["EXPECTED_DATABASE_NAME"] = parsed.database

    return test_database_url


TEST_DATABASE_URL = _prepare_test_database_environment()

from api.auth.router import create_access_token
from core.config import settings
from database.base import Base
from database.session import get_db
from main import app
from models.user import User

async def _ensure_test_database_exists() -> None:
    parsed_test_url = make_url(TEST_DATABASE_URL)
    if not parsed_test_url.drivername.startswith("postgresql"):
        return

    test_database = parsed_test_url.database
    if not is_safe_test_database_name(test_database):
        raise RuntimeError("Refusing to run tests against a non-test database.")

    admin_url = parsed_test_url.set(
        drivername="postgresql",
        database="postgres",
    ).render_as_string(hide_password=False)
    connection = await asyncpg.connect(dsn=admin_url)
    try:
        exists = await connection.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            test_database,
        )
        if not exists:
            escaped_database = str(test_database).replace('"', '""')
            await connection.execute(f'CREATE DATABASE "{escaped_database}"')
    finally:
        await connection.close()
async def _reset_test_schema() -> None:
    async with engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            await conn.exec_driver_sql("CREATE SCHEMA public")
        else:
            await conn.run_sync(Base.metadata.drop_all)

        await conn.run_sync(Base.metadata.create_all)

# Use NullPool to avoid asyncio loop issues with the connection pool
engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestingSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset in-memory rate limiter state before each test to prevent bleed-over."""
    from main import app
    from middleware.rate_limit import RateLimitMiddleware
    
    # Traverse the middleware stack to find and clear the rate limit history.
    try:
        stack = app.middleware_stack
        while hasattr(stack, 'app'):
            if isinstance(stack, RateLimitMiddleware):
                stack.request_history.clear()
                break
            stack = stack.app
    except Exception:
        pass  # Best-effort cleanup
    yield


@pytest.fixture(autouse=True)
def seed_test_payment_provider_token(monkeypatch):
    """Keep checkout tests off the TSPay availability guard in isolated test runs."""
    from api.payments.router import PAYMENT_PROVIDER

    monkeypatch.setattr(PAYMENT_PROVIDER, "access_token", "test-access-token", raising=False)
    yield

@pytest.fixture(scope="session", autouse=True)
async def init_db() -> AsyncGenerator:
    """Initialize database metadata."""
    validate_database_target(
        TEST_DATABASE_URL,
        settings.ENVIRONMENT,
        settings.EXPECTED_DATABASE_NAME or None,
    )
    await _ensure_test_database_exists()
    await _reset_test_schema()
    yield
    async with engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            await conn.exec_driver_sql("CREATE SCHEMA public")
        else:
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
        
        try:
            yield session
        finally:
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
        status="active",
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
