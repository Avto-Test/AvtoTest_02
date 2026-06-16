from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import UUID

from core.config import BASE_DIR, settings
from models.question import Question

QUESTION_UPDATE_LOG_PATH = BASE_DIR / "logs" / "question_update_compare.jsonl"
DRY_RUN_LOG_PATH = BASE_DIR / "logs" / "dry_run_writes.jsonl"


def question_update_comparison_enabled() -> bool:
    return bool(settings.LOG_QUESTION_UPDATE_COMPARISON)


def dry_run_enabled() -> bool:
    return bool(settings.DRY_RUN)


def snapshot_question_row(question: Question) -> dict[str, Any]:
    return {
        "total_attempts": int(question.total_attempts or 0),
        "total_correct": int(question.total_correct or 0),
        "dynamic_difficulty_score": round(float(question.dynamic_difficulty_score or 0.0), 6),
    }


def snapshot_question_mapping(
    *,
    total_attempts: int,
    total_correct: int,
    dynamic_difficulty_score: float,
) -> dict[str, Any]:
    return {
        "total_attempts": int(total_attempts),
        "total_correct": int(total_correct),
        "dynamic_difficulty_score": round(float(dynamic_difficulty_score), 6),
    }


def question_update_delta(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    return {
        "total_attempts": int(after["total_attempts"]) - int(before["total_attempts"]),
        "total_correct": int(after["total_correct"]) - int(before["total_correct"]),
        "dynamic_difficulty_score": round(
            float(after["dynamic_difficulty_score"]) - float(before["dynamic_difficulty_score"]),
            6,
        ),
    }


def log_question_update_comparison(
    *,
    source: str,
    question_id: UUID,
    before: dict[str, Any],
    after: dict[str, Any],
) -> None:
    if not question_update_comparison_enabled():
        return

    QUESTION_UPDATE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "source": source,
        "question_id": str(question_id),
        "before": before,
        "after": after,
        "delta": question_update_delta(before, after),
    }
    with QUESTION_UPDATE_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True, ensure_ascii=False) + "\n")


def log_dry_run_write(
    *,
    operation: str,
    entity: str,
    entity_id: UUID | str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    if not dry_run_enabled():
        return

    DRY_RUN_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "operation": operation,
        "entity": entity,
        "entity_id": str(entity_id) if entity_id is not None else None,
        "payload": payload or {},
    }
    with DRY_RUN_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True, ensure_ascii=False) + "\n")
