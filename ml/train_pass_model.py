"""Deprecated training entrypoint kept as a thin wrapper around the placeholder pipeline."""

from __future__ import annotations

from database.session import async_session_maker
from services.ml_data.training_pipeline import run_manual_training_placeholder


async def train_pass_model() -> dict[str, object]:
    async with async_session_maker() as db:
        result = await run_manual_training_placeholder(db)
        return result.__dict__
