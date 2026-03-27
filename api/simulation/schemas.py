"""
AUTOTEST Simulation Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from api.attempts.schemas import DetailedAnswer
from api.tests.schemas import PublicQuestion


class SimulationStartResponse(BaseModel):
    id: UUID
    question_count: int
    duration_minutes: int
    questions: list[PublicQuestion]
    scheduled_at: datetime
    started_at: datetime | None = None
    attempt_mode: str = "simulation"
    pressure_mode: bool = True
    mistake_limit: int = 3
    mistake_count: int = 0
    violation_limit: int = 2
    violation_count: int = 0
    disqualified: bool = False
    disqualification_reason: str | None = None
    saved_answers: list[DetailedAnswer] = []


class SimulationHistoryEntry(BaseModel):
    attempt_id: UUID
    date: datetime
    question_count: int
    score: float
    mistakes: int
    violation_count: int = 0
    pass_probability_snapshot: float
    passed: bool
    disqualified: bool = False
    disqualification_reason: str | None = None


class SimulationHistoryResponse(BaseModel):
    items: list[SimulationHistoryEntry]
