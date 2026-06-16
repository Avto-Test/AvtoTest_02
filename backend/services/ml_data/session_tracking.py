from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user_session import UserSession


def _ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _duration_seconds(started_at: datetime | None, ended_at: datetime | None) -> int | None:
    if started_at is None or ended_at is None:
        return None
    return max(0, int((ended_at - started_at).total_seconds()))


async def start_attempt_session(
    db: AsyncSession,
    attempt,
    *,
    metadata: dict[str, Any] | None = None,
) -> UserSession:
    existing = (
        await db.execute(
            select(UserSession).where(
                UserSession.attempt_id == attempt.id,
                UserSession.session_type == "attempt",
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    started_at = _ensure_utc(attempt.started_at) or datetime.now(timezone.utc)
    session = UserSession(
        user_id=attempt.user_id,
        attempt_id=attempt.id,
        session_type="attempt",
        started_at=started_at,
        last_activity_at=started_at,
        metadata_json=metadata or {
            "mode": attempt.mode,
            "question_count": attempt.question_count,
            "time_limit_seconds": attempt.time_limit_seconds,
        },
    )
    db.add(session)
    return session


async def touch_attempt_session(
    db: AsyncSession,
    attempt_id,
    *,
    activity_time: datetime | None = None,
) -> None:
    session = (
        await db.execute(
            select(UserSession).where(
                UserSession.attempt_id == attempt_id,
                UserSession.session_type == "attempt",
            )
        )
    ).scalar_one_or_none()
    if session is None:
        return
    session.last_activity_at = _ensure_utc(activity_time) or datetime.now(timezone.utc)


async def complete_attempt_session(
    db: AsyncSession,
    attempt,
    *,
    finished_at: datetime | None = None,
    metadata: dict[str, Any] | None = None,
) -> UserSession:
    session = (
        await db.execute(
            select(UserSession).where(
                UserSession.attempt_id == attempt.id,
                UserSession.session_type == "attempt",
            )
        )
    ).scalar_one_or_none()
    if session is None:
        session = await start_attempt_session(db, attempt)

    completed_at = _ensure_utc(finished_at or attempt.finished_at) or datetime.now(timezone.utc)
    session.ended_at = completed_at
    session.last_activity_at = completed_at
    session.duration_seconds = _duration_seconds(_ensure_utc(session.started_at), completed_at)
    if metadata:
        merged = dict(session.metadata_json or {})
        merged.update(metadata)
        session.metadata_json = merged
    return session


async def record_user_session_event(
    db: AsyncSession,
    *,
    user_id,
    session_type: str,
    event_time: datetime | None = None,
    metadata: dict[str, Any] | None = None,
) -> UserSession:
    event_time = _ensure_utc(event_time) or datetime.now(timezone.utc)
    session = UserSession(
        user_id=user_id,
        session_type=session_type,
        started_at=event_time,
        ended_at=event_time,
        last_activity_at=event_time,
        duration_seconds=0,
        metadata_json=metadata or {},
    )
    db.add(session)
    return session
