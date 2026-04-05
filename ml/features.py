"""Compatibility layer exposing non-ML readiness features as vectors."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from services.ml_data.readiness import (
    FEATURE_COUNT,
    FEATURE_VERSION,
    SNAPSHOT_FEATURE_NAMES,
    build_feature_vector,
    compute_user_readiness_features,
)

FEATURE_NAMES = list(SNAPSHOT_FEATURE_NAMES)


async def get_user_feature_vector(
    db: AsyncSession,
    user_id: str,
    before_at: datetime | None = None,
) -> Optional[list[float]]:
    features = await compute_user_readiness_features(db, user_id, as_of=before_at)
    if features.total_attempts <= 0:
        return None
    return build_feature_vector(features)
