"""
Learning topic analysis services.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user_topic_stats import UserTopicStats


async def detect_weak_topics(user_id: UUID, db: AsyncSession) -> list[UUID]:
    result = await db.execute(
        select(UserTopicStats.topic_id)
        .where(
            UserTopicStats.user_id == user_id,
            UserTopicStats.accuracy_rate < 0.65,
            UserTopicStats.total_attempts >= 10,
        )
        .order_by(UserTopicStats.accuracy_rate.asc(), UserTopicStats.total_attempts.desc())
    )
    return [topic_id for topic_id in result.scalars().all() if topic_id is not None]
