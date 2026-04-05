from __future__ import annotations

from datetime import datetime, timezone


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def resolve_topic_label(question) -> str:
    category_ref = getattr(question, "category_ref", None)
    if category_ref is not None and getattr(category_ref, "name", None):
        return str(category_ref.name).strip() or "General"

    for candidate in (
        getattr(question, "category", None),
        getattr(question, "topic", None),
    ):
        if candidate is not None and str(candidate).strip():
            return str(candidate).strip()

    return "General"


def resolve_question_position(attempt, question_id) -> int | None:
    question_ids = list(getattr(attempt, "question_ids", []) or [])
    try:
        return question_ids.index(str(question_id)) + 1
    except ValueError:
        return None


def apply_attempt_answer_metadata(
    answer,
    *,
    attempt,
    question,
    answered_at: datetime | None = None,
    response_time_ms: int | None = None,
) -> None:
    answer.response_time_ms = None if response_time_ms is None else max(0, int(response_time_ms))
    answer.question_position = resolve_question_position(attempt, question.id)
    answer.topic_id = getattr(question, "category_id", None)
    answer.topic_label = resolve_topic_label(question)
    answer.answered_at = _ensure_utc(answered_at)
