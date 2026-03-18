"""
AUTOTEST Simulation Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from api.tests.schemas import PublicQuestion


class SimulationStartResponse(BaseModel):
    id: UUID
    question_count: int
    duration_minutes: int
    questions: list[PublicQuestion]
    scheduled_at: datetime
    started_at: datetime | None = None
    attempt_mode: str = "simulation"


class SimulationHistoryEntry(BaseModel):
    attempt_id: UUID
    date: datetime
    score: float
    mistakes: int
    pass_probability_snapshot: float
    passed: bool


class SimulationHistoryResponse(BaseModel):
    items: list[SimulationHistoryEntry]
