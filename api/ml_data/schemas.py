from __future__ import annotations

from datetime import date, datetime, time, timezone
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


def _normalize_exam_date(value: date | datetime) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    return datetime.combine(value, time(23, 59, 59), tzinfo=timezone.utc)


class UserExamResultCreateRequest(BaseModel):
    exam_result: bool | int
    exam_date: date | datetime

    @field_validator("exam_result", mode="before")
    @classmethod
    def normalize_exam_result(cls, value: bool | int) -> int:
        if isinstance(value, bool):
            return int(value)
        return 1 if int(value) else 0

    @field_validator("exam_date", mode="before")
    @classmethod
    def normalize_exam_date_value(cls, value: date | datetime) -> datetime:
        return _normalize_exam_date(value)


class UserExamResultResponse(BaseModel):
    id: UUID
    user_id: UUID
    exam_result: int
    exam_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class UserExamResultsResponse(BaseModel):
    items: list[UserExamResultResponse] = Field(default_factory=list)
