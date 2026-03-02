"""
AUTOTEST Database Session
Async SQLAlchemy engine and session configuration
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings

# Database URL from settings
DATABASE_URL = settings.DATABASE_URL
print(f"DEBUG: Using DATABASE_URL: {DATABASE_URL}")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to False to avoid potential sync logging issues
    future=True,
)

# Create async session factory
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides an async database session.
    Usage in FastAPI endpoints:
        async def endpoint(db: AsyncSession = Depends(get_db)):
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
