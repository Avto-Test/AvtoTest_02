"""
AUTOTEST Database Package
"""

from database.base import Base

__all__ = ["Base", "get_db", "async_session_maker", "engine"]


def __getattr__(name: str):
    if name in {"get_db", "async_session_maker", "engine"}:
        from database.session import async_session_maker, engine, get_db

        exports = {
            "get_db": get_db,
            "async_session_maker": async_session_maker,
            "engine": engine,
        }
        return exports[name]
    raise AttributeError(f"module 'database' has no attribute {name!r}")
