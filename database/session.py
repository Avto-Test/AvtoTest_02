"""
AUTOTEST Database Session
Async SQLAlchemy engine and session configuration
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings
from database.safety import render_database_target

logger = logging.getLogger(__name__)

# Database URL from settings
DATABASE_URL = settings.DATABASE_URL
logger.debug("Configuring database engine for %s", render_database_target(DATABASE_URL))

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to False to avoid potential sync logging issues
    future=True,
    pool_pre_ping=True,
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
