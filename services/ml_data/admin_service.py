from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from models.user_exam_result import UserExamResult
from models.user_prediction_snapshot import UserPredictionSnapshot
from services.ml_data.dataset_builder import fetch_dataset_rows
from services.ml_data.readiness import SNAPSHOT_FEATURE_NAMES
from services.ml_data.training_pipeline import latest_training_artifact


def _ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _bucketize(value: float | None, edges: list[tuple[str, float]]) -> str:
    if value is None:
        return "Unknown"
    for label, upper_bound in edges:
        if value <= upper_bound:
            return label
    return edges[-1][0]


async def build_ml_admin_dashboard(db: AsyncSession) -> dict[str, Any]:
    total_users = int((await db.execute(select(func.count(User.id)))).scalar_one() or 0)
    total_snapshots = int((await db.execute(select(func.count(UserPredictionSnapshot.id)))).scalar_one() or 0)
    total_exam_results = int((await db.execute(select(func.count(UserExamResult.id)))).scalar_one() or 0)

    dataset_rows = await fetch_dataset_rows(db, only_usable=False)
    total_dataset_rows = len(dataset_rows)
    labeled_ratio = round((total_dataset_rows / total_snapshots) * 100.0, 2) if total_snapshots else 0.0

    avg_time_gap = (
        round(sum(row.time_gap_days for row in dataset_rows) / total_dataset_rows, 4)
        if total_dataset_rows
        else None
    )
    activity_gap_values = [row.activity_gap_days for row in dataset_rows if row.activity_gap_days is not None]
    avg_activity_gap = (
        round(sum(activity_gap_values) / len(activity_gap_values), 4)
        if activity_gap_values
        else None
    )
    avg_confidence = (
        round(sum(row.confidence_score for row in dataset_rows) / total_dataset_rows, 4)
        if total_dataset_rows
        else None
    )

    time_gap_edges = [
        ("0-3 days", 3.0),
        ("4-7 days", 7.0),
        ("8-14 days", 14.0),
        ("15-30 days", 30.0),
        (">30 days", float("inf")),
    ]
    confidence_edges = [
        ("0.00-0.25", 0.25),
        ("0.26-0.50", 0.50),
        ("0.51-0.75", 0.75),
        ("0.76-1.00", 1.00),
    ]

    time_gap_buckets = {label: 0 for label, _ in time_gap_edges}
    confidence_buckets = {label: 0 for label, _ in confidence_edges}
    usable_rows = 0
    unusable_rows = 0
    low_confidence_rows = 0

    for row in dataset_rows:
        time_gap_buckets[_bucketize(row.time_gap_days, time_gap_edges)] += 1
        confidence_buckets[_bucketize(row.confidence_score, confidence_edges)] += 1
        if row.is_usable:
            usable_rows += 1
        else:
            unusable_rows += 1
        if row.confidence_score < 0.45:
            low_confidence_rows += 1

    snapshot_rows = (
        await db.execute(
            select(UserPredictionSnapshot).order_by(UserPredictionSnapshot.created_at.desc())
        )
    ).scalars().all()
    total_snapshot_rows = len(snapshot_rows)
    feature_stats: list[dict[str, Any]] = []
    for feature_name in SNAPSHOT_FEATURE_NAMES:
        values = [
            float(getattr(snapshot, feature_name, 0.0))
            for snapshot in snapshot_rows
            if getattr(snapshot, feature_name, None) is not None
        ]
        feature_stats.append(
            {
                "feature": feature_name,
                "average": round(sum(values) / len(values), 4) if values else None,
                "missing_count": total_snapshot_rows - len(values),
                "sample_size": len(values),
            }
        )

    training_status = {
        "status": "not_run",
        "artifact_path": None,
        "created_at": None,
        "message": "Manual placeholder training has not been run yet.",
    }
    latest_artifact = latest_training_artifact()
    if latest_artifact is not None and latest_artifact.exists():
        try:
            payload = json.loads(latest_artifact.read_text(encoding="utf-8"))
            training_status = {
                "status": str(payload.get("status", "placeholder_only")),
                "artifact_path": str(latest_artifact),
                "created_at": payload.get("created_at"),
                "message": str(payload.get("message", "")),
            }
        except json.JSONDecodeError:
            training_status = {
                "status": "invalid_artifact",
                "artifact_path": str(latest_artifact),
                "created_at": _ensure_utc(datetime.fromtimestamp(latest_artifact.stat().st_mtime, tz=timezone.utc)).isoformat(),
                "message": "Latest training artifact could not be parsed.",
            }

    return {
        "stats": {
            "total_users": total_users,
            "total_snapshots": total_snapshots,
            "total_exam_results": total_exam_results,
            "total_dataset_rows": total_dataset_rows,
            "labeled_ratio": labeled_ratio,
        },
        "quality": {
            "avg_time_gap_days": avg_time_gap,
            "avg_activity_gap_days": avg_activity_gap,
            "avg_confidence_score": avg_confidence,
            "time_gap_distribution": [
                {"label": label, "count": count}
                for label, count in time_gap_buckets.items()
            ],
            "confidence_distribution": [
                {"label": label, "count": count}
                for label, count in confidence_buckets.items()
            ],
        },
        "feature_stats": feature_stats,
        "dataset_health": {
            "usable_rows": usable_rows,
            "unusable_rows": unusable_rows,
            "low_confidence_rows": low_confidence_rows,
            "missing_snapshot_exam_results": max(0, total_exam_results - total_dataset_rows),
        },
        "training_status": training_status,
    }
