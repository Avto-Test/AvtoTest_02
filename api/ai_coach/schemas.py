"""Schemas for AI coach explanations."""

from pydantic import BaseModel


class CoachExplanationResponse(BaseModel):
    title: str = "AI Coach"
    explanation: str
    selected_feedback: str | None = None
    driving_tip: str
    motivation: str
