"""Database readiness helpers for startup checks and friendly failures."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

PROJECT_ROOT = Path(__file__).resolve().parent.parent


async def has_required_core_tables(connection: AsyncConnection) -> bool:
    """Return True when the minimum auth-critical tables exist in the current database."""
    result = await connection.execute(
        text(
            """
            SELECT
              to_regclass('public.users') IS NOT NULL
              AND to_regclass('public.alembic_version') IS NOT NULL
            """
        )
    )
    return bool(result.scalar())


@lru_cache
def get_expected_alembic_heads() -> tuple[str, ...]:
    """Return the set of Alembic head revisions expected by the running codebase."""

    config = Config(str(PROJECT_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(PROJECT_ROOT / "alembic"))
    script = ScriptDirectory.from_config(config)
    return tuple(script.get_heads())


async def get_current_alembic_versions(connection: AsyncConnection) -> tuple[str, ...]:
    """Return the Alembic revisions currently applied to the connected database."""

    result = await connection.execute(
        text("SELECT version_num FROM alembic_version ORDER BY version_num")
    )
    return tuple(row[0] for row in result.fetchall())


async def verify_database_startup_ready(
    connection: AsyncConnection,
    *,
    require_migration_head: bool = True,
) -> None:
    """Validate that the connected database is ready for application startup."""

    if not await has_required_core_tables(connection):
        raise RuntimeError(
            "Database schema is not initialized. Run 'python scripts/safe_migrate.py' "
            "for the configured environment before starting the app."
        )

    if not require_migration_head:
        return

    current_versions = set(await get_current_alembic_versions(connection))
    expected_heads = set(get_expected_alembic_heads())

    if not current_versions:
        raise RuntimeError("Database is missing Alembic version metadata; refusing startup.")

    if current_versions != expected_heads:
        raise RuntimeError(
            "Database migrations are out of date. "
            f"Current revisions: {sorted(current_versions)}. "
            f"Expected heads: {sorted(expected_heads)}."
        )
