"""
AUTOTEST Test Fixtures
Configuration for async tests, database, and authentication
"""

import os
from typing import AsyncGenerator

import asyncpg
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

os.environ.setdefault("ENVIRONMENT", "testing")

from api.auth.router import create_access_token
from core.config import settings
from database.base import Base
from database.session import get_db
from main import app
from models.user import User

SAFE_TEST_DB_MARKERS = ("test", "pytest", "ci")


def _is_safe_test_database_name(database_name: str | None) -> bool:
    if not database_name:
        return False
    normalized = database_name.strip().lower()
    return any(marker in normalized for marker in SAFE_TEST_DB_MARKERS)


def _resolve_test_database_url() -> str:
    explicit_url = os.getenv("TEST_DATABASE_URL", "").strip()
    if explicit_url:
        parsed_explicit = make_url(explicit_url)
        if not _is_safe_test_database_name(parsed_explicit.database):
            raise RuntimeError(
                "TEST_DATABASE_URL must point to a dedicated test database."
            )
        return parsed_explicit.render_as_string(hide_password=False)

    parsed_default = make_url(settings.DATABASE_URL)
    default_database = parsed_default.database
    if _is_safe_test_database_name(default_database):
        return parsed_default.render_as_string(hide_password=False)

    if not default_database:
        raise RuntimeError("DATABASE_URL is missing a database name; cannot derive a safe test DB.")

    derived_database = f"{default_database}_test"
    return parsed_default.set(database=derived_database).render_as_string(hide_password=False)


TEST_DATABASE_URL = _resolve_test_database_url()


async def _ensure_test_database_exists() -> None:
    parsed_test_url = make_url(TEST_DATABASE_URL)
    if not parsed_test_url.drivername.startswith("postgresql"):
        return

    test_database = parsed_test_url.database
    if not _is_safe_test_database_name(test_database):
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

@pytest.fixture(scope="session", autouse=True)
async def init_db() -> AsyncGenerator:
    """Initialize database metadata."""
    await _ensure_test_database_exists()
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
