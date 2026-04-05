"""Drift monitoring is intentionally disabled until supervised training is enabled."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Optional


def calculate_psi(expected_pcts: list[float], actual_pcts: list[float]) -> float:
    score = 0.0
    for expected, actual in zip(expected_pcts, actual_pcts):
        expected = max(float(expected), 0.0001)
        actual = max(float(actual), 0.0001)
        score += (actual - expected) * __import__("math").log(actual / expected)
    return float(score)


def calculate_kl_divergence(p: list[float], q: list[float]) -> float:
    score = 0.0
    for left, right in zip(p, q):
        left = max(float(left), 0.0001)
        right = max(float(right), 0.0001)
        score += left * __import__("math").log(left / right)
    return float(score)


class DriftMonitor:
    def __init__(self, db, engine):
        self.db = db
        self.engine = engine

    async def run_checks(self) -> Dict[str, object]:
        return {
            "status": "disabled",
            "message": "Model drift monitoring is disabled until manual supervised training is enabled.",
            "last_checked": datetime.now(timezone.utc).isoformat(),
        }


def get_drift_state() -> Optional[Dict[str, object]]:
    return {
        "status": "disabled",
        "message": "No active production model.",
    }
