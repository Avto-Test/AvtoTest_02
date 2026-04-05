from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt import Attempt
from models.user_prediction_snapshot import UserPredictionSnapshot
from services.ml_data.readiness import ReadinessFeatures, compute_user_readiness_features
from services.ml_data.session_tracking import record_user_session_event


def _ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def get_latest_prediction_snapshot(
    db: AsyncSession,
    user_id,
) -> UserPredictionSnapshot | None:
    return (
        await db.execute(
            select(UserPredictionSnapshot)
            .where(UserPredictionSnapshot.user_id == user_id)
            .order_by(UserPredictionSnapshot.snapshot_time.desc(), UserPredictionSnapshot.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


def _snapshot_from_features(
    *,
    user_id,
    trigger_source: str,
    snapshot_time: datetime,
    features: ReadinessFeatures,
    attempt_id=None,
) -> UserPredictionSnapshot:
    return UserPredictionSnapshot(
        user_id=user_id,
        attempt_id=attempt_id,
        trigger_source=trigger_source,
        snapshot_time=snapshot_time,
        last_activity_time=features.last_activity_time,
        last_score=features.last_score,
        last_5_avg=features.last_5_avg,
        last_5_std=features.last_5_std,
        improvement_rate=features.improvement_rate,
        total_attempts=features.total_attempts,
        overall_accuracy=features.overall_accuracy,
        avg_response_time=features.avg_response_time,
        response_time_variance=features.response_time_variance,
        weakest_topic_accuracy=features.weakest_topic_accuracy,
        strongest_topic_accuracy=features.strongest_topic_accuracy,
        topic_entropy=features.topic_entropy,
        consistency_score=features.consistency_score,
    )


async def create_prediction_snapshot(
    db: AsyncSession,
    *,
    user_id,
    snapshot_time: datetime | None = None,
    trigger_source: str,
    attempt_id=None,
    features: ReadinessFeatures | None = None,
) -> tuple[UserPredictionSnapshot, ReadinessFeatures]:
    snapshot_time = _ensure_utc(snapshot_time) or datetime.now(timezone.utc)
    resolved_features = features or await compute_user_readiness_features(
        db,
        user_id,
        as_of=snapshot_time,
    )
    snapshot = _snapshot_from_features(
        user_id=user_id,
        attempt_id=attempt_id,
        trigger_source=trigger_source,
        snapshot_time=snapshot_time,
        features=resolved_features,
    )
    db.add(snapshot)
    return snapshot, resolved_features


async def record_readiness_view_snapshot(
    db: AsyncSession,
    *,
    user_id,
    view_name: str,
    snapshot_time: datetime | None = None,
) -> tuple[UserPredictionSnapshot, ReadinessFeatures]:
    snapshot_time = _ensure_utc(snapshot_time) or datetime.now(timezone.utc)
    snapshot, features = await create_prediction_snapshot(
        db,
        user_id=user_id,
        snapshot_time=snapshot_time,
        trigger_source="readiness_view",
    )
    await record_user_session_event(
        db,
        user_id=user_id,
        session_type="readiness_view",
        event_time=snapshot_time,
        metadata={"view": view_name},
    )
    return snapshot, features


async def backfill_missing_attempt_snapshots(
    db: AsyncSession,
    *,
    limit: int | None = None,
) -> int:
    stmt = (
        select(Attempt)
        .outerjoin(
            UserPredictionSnapshot,
            and_(
                UserPredictionSnapshot.attempt_id == Attempt.id,
                UserPredictionSnapshot.trigger_source == "attempt_completion",
            ),
        )
        .where(
            Attempt.finished_at.is_not(None),
            UserPredictionSnapshot.id.is_(None),
        )
        .order_by(Attempt.finished_at.asc())
    )
    if limit is not None:
        stmt = stmt.limit(limit)

    attempts = (await db.execute(stmt)).scalars().all()
    created = 0
    for attempt in attempts:
        await create_prediction_snapshot(
            db,
            user_id=attempt.user_id,
            snapshot_time=attempt.finished_at,
            trigger_source="attempt_completion",
            attempt_id=attempt.id,
        )
        created += 1
    return created
