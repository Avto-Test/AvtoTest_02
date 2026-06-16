from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.ml_dataset import MLDataset
from models.user_exam_result import UserExamResult
from models.user_prediction_snapshot import UserPredictionSnapshot
from services.ml_data.readiness import SNAPSHOT_FEATURE_NAMES
from services.ml_data.snapshot_service import backfill_missing_attempt_snapshots

MAX_TIME_GAP_DAYS = 30.0
MAX_ACTIVITY_GAP_DAYS = 20.0


@dataclass(slots=True)
class DatasetBuildSummary:
    built_rows: int
    usable_rows: int
    unusable_rows: int
    skipped_no_snapshot: int
    total_exam_results: int
    built_at: datetime


def _ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _days_between(later: datetime | None, earlier: datetime | None) -> float | None:
    later_utc = _ensure_utc(later)
    earlier_utc = _ensure_utc(earlier)
    if later_utc is None or earlier_utc is None:
        return None
    return max(0.0, (later_utc - earlier_utc).total_seconds() / 86400.0)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def snapshot_feature_payload(snapshot: UserPredictionSnapshot) -> dict[str, float | int]:
    return {
        "last_score": round(float(snapshot.last_score or 0.0), 4),
        "last_5_avg": round(float(snapshot.last_5_avg or 0.0), 4),
        "last_5_std": round(float(snapshot.last_5_std or 0.0), 4),
        "improvement_rate": round(float(snapshot.improvement_rate or 0.0), 4),
        "total_attempts": int(snapshot.total_attempts or 0),
        "overall_accuracy": round(float(snapshot.overall_accuracy or 0.0), 4),
        "avg_response_time": round(float(snapshot.avg_response_time or 0.0), 4),
        "response_time_variance": round(float(snapshot.response_time_variance or 0.0), 4),
        "weakest_topic_accuracy": round(float(snapshot.weakest_topic_accuracy or 0.0), 4),
        "strongest_topic_accuracy": round(float(snapshot.strongest_topic_accuracy or 0.0), 4),
        "topic_entropy": round(float(snapshot.topic_entropy or 0.0), 6),
        "consistency_score": round(float(snapshot.consistency_score or 0.0), 4),
    }


def compute_time_gap_days(
    snapshot: UserPredictionSnapshot,
    exam_result: UserExamResult,
) -> float:
    return round(_days_between(exam_result.exam_date, snapshot.snapshot_time) or 0.0, 4)


def compute_activity_gap_days(snapshot: UserPredictionSnapshot) -> float | None:
    gap = _days_between(snapshot.snapshot_time, snapshot.last_activity_time)
    return None if gap is None else round(gap, 4)


def compute_confidence_score(
    *,
    snapshot: UserPredictionSnapshot,
    time_gap_days: float,
    activity_gap_days: float | None,
) -> float:
    recency_component = _clamp(1.0 - (time_gap_days / MAX_TIME_GAP_DAYS))
    activity_component = 0.5
    if activity_gap_days is not None:
        activity_component = _clamp(1.0 - (activity_gap_days / MAX_ACTIVITY_GAP_DAYS))

    consistency_component = _clamp(float(snapshot.consistency_score or 0.0) / 100.0)
    volume_component = _clamp(int(snapshot.total_attempts or 0) / 10.0)

    confidence = (
        (recency_component * 0.4)
        + (activity_component * 0.25)
        + (consistency_component * 0.2)
        + (volume_component * 0.15)
    )
    return round(_clamp(confidence), 4)


def build_quality_flags(
    *,
    snapshot: UserPredictionSnapshot,
    time_gap_days: float,
    activity_gap_days: float | None,
    confidence_score: float,
) -> list[str]:
    flags: list[str] = []
    if time_gap_days > MAX_TIME_GAP_DAYS:
        flags.append("time_gap_over_30_days")
    if activity_gap_days is not None and activity_gap_days > MAX_ACTIVITY_GAP_DAYS:
        flags.append("activity_gap_over_20_days")
    if int(snapshot.total_attempts or 0) < 3:
        flags.append("low_attempt_volume")
    if float(snapshot.overall_accuracy or 0.0) <= 0.0:
        flags.append("no_recorded_accuracy")
    if confidence_score < 0.4:
        flags.append("low_confidence_score")
    return flags


def confidence_band(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def is_usable_row(*, quality_flags: list[str]) -> bool:
    blocking_flags = {
        "time_gap_over_30_days",
        "activity_gap_over_20_days",
        "low_confidence_score",
    }
    return not any(flag in blocking_flags for flag in quality_flags)


async def find_snapshot_for_exam_result(
    db: AsyncSession,
    *,
    user_id,
    exam_date: datetime,
) -> UserPredictionSnapshot | None:
    exam_date = _ensure_utc(exam_date) or datetime.now(timezone.utc)
    return (
        await db.execute(
            select(UserPredictionSnapshot)
            .where(
                UserPredictionSnapshot.user_id == user_id,
                UserPredictionSnapshot.snapshot_time <= exam_date,
            )
            .order_by(UserPredictionSnapshot.snapshot_time.desc(), UserPredictionSnapshot.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def upsert_dataset_row(
    db: AsyncSession,
    *,
    exam_result: UserExamResult,
    snapshot: UserPredictionSnapshot,
) -> MLDataset:
    feature_payload = snapshot_feature_payload(snapshot)
    time_gap_days = compute_time_gap_days(snapshot, exam_result)
    activity_gap_days = compute_activity_gap_days(snapshot)
    confidence_score = compute_confidence_score(
        snapshot=snapshot,
        time_gap_days=time_gap_days,
        activity_gap_days=activity_gap_days,
    )
    quality_flags = build_quality_flags(
        snapshot=snapshot,
        time_gap_days=time_gap_days,
        activity_gap_days=activity_gap_days,
        confidence_score=confidence_score,
    )
    usable = is_usable_row(quality_flags=quality_flags)

    dataset_row = (
        await db.execute(select(MLDataset).where(MLDataset.exam_result_id == exam_result.id))
    ).scalar_one_or_none()
    if dataset_row is None:
        dataset_row = MLDataset(
            user_id=exam_result.user_id,
            exam_result_id=exam_result.id,
            snapshot_id=snapshot.id,
        )
        db.add(dataset_row)

    dataset_row.user_id = exam_result.user_id
    dataset_row.snapshot_id = snapshot.id
    dataset_row.features = feature_payload
    dataset_row.snapshot_time = snapshot.snapshot_time
    dataset_row.last_score = float(snapshot.last_score or 0.0)
    dataset_row.last_5_avg = float(snapshot.last_5_avg or 0.0)
    dataset_row.last_5_std = float(snapshot.last_5_std or 0.0)
    dataset_row.improvement_rate = float(snapshot.improvement_rate or 0.0)
    dataset_row.total_attempts = int(snapshot.total_attempts or 0)
    dataset_row.overall_accuracy = float(snapshot.overall_accuracy or 0.0)
    dataset_row.avg_response_time = float(snapshot.avg_response_time or 0.0)
    dataset_row.response_time_variance = float(snapshot.response_time_variance or 0.0)
    dataset_row.weakest_topic_accuracy = float(snapshot.weakest_topic_accuracy or 0.0)
    dataset_row.strongest_topic_accuracy = float(snapshot.strongest_topic_accuracy or 0.0)
    dataset_row.topic_entropy = float(snapshot.topic_entropy or 0.0)
    dataset_row.consistency_score = float(snapshot.consistency_score or 0.0)
    dataset_row.label = int(exam_result.exam_result)
    dataset_row.time_gap_days = time_gap_days
    dataset_row.activity_gap_days = activity_gap_days
    dataset_row.confidence_score = confidence_score
    dataset_row.confidence_band = confidence_band(confidence_score)
    dataset_row.is_usable = usable
    dataset_row.quality_flags = quality_flags
    dataset_row.built_at = datetime.now(timezone.utc)
    return dataset_row


async def build_ml_dataset(
    db: AsyncSession,
    *,
    user_id=None,
) -> DatasetBuildSummary:
    await backfill_missing_attempt_snapshots(db)

    stmt = select(UserExamResult).order_by(UserExamResult.exam_date.asc(), UserExamResult.created_at.asc())
    if user_id is not None:
        stmt = stmt.where(UserExamResult.user_id == user_id)

    exam_results = (await db.execute(stmt)).scalars().all()
    built_rows = 0
    usable_rows = 0
    unusable_rows = 0
    skipped_no_snapshot = 0

    for exam_result in exam_results:
        snapshot = await find_snapshot_for_exam_result(
            db,
            user_id=exam_result.user_id,
            exam_date=exam_result.exam_date,
        )
        if snapshot is None:
            skipped_no_snapshot += 1
            continue

        dataset_row = await upsert_dataset_row(
            db,
            exam_result=exam_result,
            snapshot=snapshot,
        )
        built_rows += 1
        if dataset_row.is_usable:
            usable_rows += 1
        else:
            unusable_rows += 1

    return DatasetBuildSummary(
        built_rows=built_rows,
        usable_rows=usable_rows,
        unusable_rows=unusable_rows,
        skipped_no_snapshot=skipped_no_snapshot,
        total_exam_results=len(exam_results),
        built_at=datetime.now(timezone.utc),
    )


def dataset_csv_columns() -> list[str]:
    return [
        "snapshot_id",
        "user_id",
        "exam_result_id",
        *SNAPSHOT_FEATURE_NAMES,
        "label",
        "time_gap_days",
        "activity_gap_days",
        "confidence_score",
        "confidence_band",
        "is_usable",
        "quality_flags",
        "snapshot_time",
        "built_at",
    ]


def dataset_row_to_csv_payload(row: MLDataset) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "snapshot_id": str(row.snapshot_id),
        "user_id": str(row.user_id),
        "exam_result_id": str(row.exam_result_id),
        "label": int(row.label),
        "time_gap_days": row.time_gap_days,
        "activity_gap_days": row.activity_gap_days,
        "confidence_score": row.confidence_score,
        "confidence_band": row.confidence_band,
        "is_usable": row.is_usable,
        "quality_flags": ",".join(row.quality_flags or []),
        "snapshot_time": _ensure_utc(row.snapshot_time).isoformat() if row.snapshot_time else "",
        "built_at": _ensure_utc(row.built_at).isoformat() if row.built_at else "",
    }
    feature_payload = row.features or {}
    for feature_name in SNAPSHOT_FEATURE_NAMES:
        payload[feature_name] = feature_payload.get(feature_name, getattr(row, feature_name, None))
    return payload


async def fetch_dataset_rows(
    db: AsyncSession,
    *,
    only_usable: bool = False,
) -> list[MLDataset]:
    stmt = select(MLDataset).order_by(MLDataset.built_at.desc(), MLDataset.snapshot_time.desc())
    if only_usable:
        stmt = stmt.where(MLDataset.is_usable.is_(True))
    return (await db.execute(stmt)).scalars().all()


async def export_ml_dataset_csv(
    db: AsyncSession,
    *,
    only_usable: bool = False,
    output_path: str | Path | None = None,
) -> tuple[str, str]:
    rows = await fetch_dataset_rows(db, only_usable=only_usable)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=dataset_csv_columns())
    writer.writeheader()
    for row in rows:
        writer.writerow(dataset_row_to_csv_payload(row))

    csv_text = buffer.getvalue()
    if output_path is None:
        artifact_dir = Path(settings.ML_ARTIFACTS_DIR)
        artifact_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output_path = artifact_dir / f"ml_dataset_{timestamp}.csv"

    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(csv_text, encoding="utf-8", newline="")
    return str(output_file), csv_text
