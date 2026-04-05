"""Manual-only retraining compatibility shim."""

from __future__ import annotations


async def check_retrain_needed() -> str:
    return "Manual training only. Automatic retraining is disabled while ML infrastructure is data-first."
