from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from services.ml_data.dataset_builder import fetch_dataset_rows
from services.ml_data.readiness import SNAPSHOT_FEATURE_NAMES


@dataclass(slots=True)
class TrainingPlaceholderResult:
    status: str
    message: str
    artifact_path: str
    dataset_rows: int
    usable_rows: int
    train_rows: int
    test_rows: int
    created_at: datetime


def _artifact_dir() -> Path:
    directory = Path(settings.ML_ARTIFACTS_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


async def run_manual_training_placeholder(db: AsyncSession) -> TrainingPlaceholderResult:
    dataset_rows = await fetch_dataset_rows(db, only_usable=False)
    usable_rows = [row for row in dataset_rows if row.is_usable]
    total_usable = len(usable_rows)

    if total_usable <= 1:
        train_rows = total_usable
        test_rows = 0
    else:
        test_rows = max(1, round(total_usable * 0.2))
        train_rows = max(0, total_usable - test_rows)

    created_at = datetime.now(timezone.utc)
    artifact_path = _artifact_dir() / f"training_placeholder_{created_at.strftime('%Y%m%d_%H%M%S')}.json"
    artifact_payload = {
        "status": "placeholder_only",
        "message": "No ML model was trained. This artifact confirms the manual training pipeline is wired.",
        "created_at": created_at.isoformat(),
        "dataset_rows": len(dataset_rows),
        "usable_rows": total_usable,
        "train_rows": train_rows,
        "test_rows": test_rows,
        "feature_names": list(SNAPSHOT_FEATURE_NAMES),
        "artifact_type": "manual_training_placeholder",
    }
    artifact_path.write_text(json.dumps(artifact_payload, indent=2), encoding="utf-8")

    return TrainingPlaceholderResult(
        status="placeholder_only",
        message="Manual training pipeline is ready, but model training remains intentionally disabled.",
        artifact_path=str(artifact_path),
        dataset_rows=len(dataset_rows),
        usable_rows=total_usable,
        train_rows=train_rows,
        test_rows=test_rows,
        created_at=created_at,
    )


def latest_training_artifact() -> Path | None:
    artifact_dir = _artifact_dir()
    candidates = sorted(artifact_dir.glob("training_placeholder_*.json"), reverse=True)
    return candidates[0] if candidates else None
