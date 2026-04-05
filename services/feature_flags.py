"""
Feature catalog helpers.
"""

from __future__ import annotations

from typing import Final
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.feature import Feature

DEFAULT_FEATURE_FLAGS: Final[tuple[dict[str, object], ...]] = (
    {
        "key": "analytics_view",
        "name": "Advanced analytics insights",
        "is_premium": True,
        "experiment_group": "analytics_unlock_test",
        "rollout_percentage": 0,
        "feature_usage_limit": None,
        "current_price": Decimal("10.00"),
    },
    {
        "key": "ai_prediction",
        "name": "AI prediction and explanations",
        "is_premium": True,
        "experiment_group": "ai_prediction_test",
        "rollout_percentage": 0,
        "feature_usage_limit": None,
        "current_price": Decimal("10.00"),
    },
    {
        "key": "simulation_run",
        "name": "Exam simulation",
        "is_premium": True,
        "experiment_group": "simulation_unlock_test",
        "rollout_percentage": 0,
        "feature_usage_limit": None,
        "current_price": Decimal("10.00"),
    },
)


async def ensure_feature_catalog(db: AsyncSession) -> list[Feature]:
    """Seed required feature rows when they are missing."""
    result = await db.execute(select(Feature))
    existing_features = list(result.scalars().all())
    existing_keys = {feature.key for feature in existing_features}

    missing_features = [
        Feature(
            key=str(definition["key"]),
            name=str(definition["name"]),
            is_premium=bool(definition["is_premium"]),
            experiment_group=str(definition["experiment_group"]),
            rollout_percentage=int(definition["rollout_percentage"]),
            feature_usage_limit=definition["feature_usage_limit"],
            current_price=definition["current_price"],
        )
        for definition in DEFAULT_FEATURE_FLAGS
        if str(definition["key"]) not in existing_keys
    ]
    if missing_features:
        db.add_all(missing_features)
        await db.commit()
        refreshed = await db.execute(select(Feature).order_by(Feature.key.asc()))
        return list(refreshed.scalars().all())

    updated = False
    defaults_by_key = {str(item["key"]): item for item in DEFAULT_FEATURE_FLAGS}
    for feature in existing_features:
        defaults = defaults_by_key.get(feature.key)
        if not defaults:
            continue
        if feature.experiment_group is None:
            feature.experiment_group = str(defaults["experiment_group"])
            updated = True
        if feature.rollout_percentage is None:
            feature.rollout_percentage = int(defaults["rollout_percentage"])
            updated = True
        if feature.current_price is None and defaults.get("current_price") is not None:
            feature.current_price = defaults["current_price"]
            updated = True

    if updated:
        await db.commit()

    return sorted(existing_features, key=lambda feature: feature.key)


async def get_feature_by_key(
    db: AsyncSession,
    feature_key: str,
) -> Feature | None:
    """Load a feature row, auto-seeding the catalog when needed."""
    normalized_key = feature_key.strip().lower()
    if not normalized_key:
        return None

    features = await ensure_feature_catalog(db)
    for feature in features:
        if feature.key == normalized_key:
            return feature
    return None
