"""
AUTOTEST leaderboard background scheduler.
Refreshes persisted leaderboard snapshots on a fixed interval.
"""

from __future__ import annotations

import asyncio
import logging

from database.session import async_session_maker
from services.gamification.rewards import refresh_all_leaderboard_snapshots

logger = logging.getLogger(__name__)
LEADERBOARD_REFRESH_INTERVAL_SECONDS = 300


async def refresh_leaderboards_once() -> None:
    async with async_session_maker() as db:
        try:
            await refresh_all_leaderboard_snapshots(db)
            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Leaderboard snapshot refresh failed.")
            raise


async def leaderboard_refresh_loop() -> None:
    while True:
        try:
            await refresh_leaderboards_once()
        except Exception:
            # Error is already logged. Keep the loop alive.
            pass
        await asyncio.sleep(LEADERBOARD_REFRESH_INTERVAL_SECONDS)
