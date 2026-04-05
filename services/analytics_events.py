"""Shared analytics-event persistence helpers."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime, timezone
from enum import Enum
import logging
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from database.session import async_session_maker
from models.analytics_event import AnalyticsEvent
from services.experiments import build_experiment_enriched_metadata

logger = logging.getLogger(__name__)


class MonetizationEventType(str, Enum):
    PREMIUM_BLOCK_VIEW = "premium_block_view"
    UPGRADE_CLICK = "upgrade_click"
    UPGRADE_SUCCESS = "upgrade_success"
    FEATURE_USED = "feature_used"
    FEATURE_LOCKED_CLICK = "feature_locked_click"


MONETIZATION_EVENT_TYPES = frozenset(event.value for event in MonetizationEventType)
LEGACY_UPGRADE_CLICK_EVENTS = frozenset({"premium_click", "premium_upgrade_click", "upgrade_click"})
PURCHASE_SUCCESS_EVENT_TYPES = frozenset({"upgrade_success", "payment_success"})


def normalize_event_type(value: str | Enum | None) -> str:
    if isinstance(value, Enum):
        return str(value.value).strip().lower()
    return str(value or "").strip().lower()


def normalize_feature_key(value: str | None) -> str | None:
    normalized = str(value or "").strip().lower()
    return normalized or None


def sanitize_metadata(payload: Mapping[str, Any] | None) -> dict[str, Any]:
    if not payload:
        return {}

    def _sanitize(value: Any, *, depth: int = 0) -> Any:
        if depth >= 4:
            return str(value)
        if value is None or isinstance(value, (bool, int, float, str)):
            return value
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat() if value.tzinfo else value.isoformat()
        if isinstance(value, UUID):
            return str(value)
        if isinstance(value, Mapping):
            return {
                str(key)[:80]: _sanitize(nested, depth=depth + 1)
                for key, nested in value.items()
            }
        if isinstance(value, (list, tuple, set, frozenset)):
            return [_sanitize(item, depth=depth + 1) for item in value]
        return str(value)

    return {
        str(key)[:80]: _sanitize(value)
        for key, value in payload.items()
    }


async def record_analytics_event(
    db: AsyncSession,
    *,
    user_id: UUID | None,
    event_type: str | Enum,
    feature_key: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    enrich_experiments: bool = True,
    created_at: datetime | None = None,
) -> AnalyticsEvent:
    """Persist an analytics event, optionally enriched with active experiment assignments."""

    normalized_event_type = normalize_event_type(event_type)
    if not normalized_event_type:
        raise ValueError("event_type is required")

    normalized_feature_key = normalize_feature_key(feature_key)
    metadata_payload = sanitize_metadata(metadata)
    if enrich_experiments:
        metadata_payload = await build_experiment_enriched_metadata(
            db,
            user_id=user_id,
            metadata=metadata_payload,
        )

    event = AnalyticsEvent(
        user_id=user_id,
        event_type=normalized_event_type[:100],
        feature_key=normalized_feature_key,
        metadata_json=metadata_payload,
        created_at=created_at or datetime.now(timezone.utc),
    )
    db.add(event)
    return event


async def persist_analytics_event(
    *,
    user_id: UUID | None,
    event_type: str | Enum,
    feature_key: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    enrich_experiments: bool = True,
    created_at: datetime | None = None,
) -> None:
    """Persist an analytics event in an isolated background-session."""

    try:
        async with async_session_maker() as session:
            await record_analytics_event(
                session,
                user_id=user_id,
                event_type=event_type,
                feature_key=feature_key,
                metadata=metadata,
                enrich_experiments=enrich_experiments,
                created_at=created_at,
            )
            await session.commit()
    except Exception:  # pragma: no cover - defensive logging around fire-and-forget work
        logger.exception(
            "Background analytics persistence failed for event_type=%s feature_key=%s",
            normalize_event_type(event_type),
            normalize_feature_key(feature_key),
        )
