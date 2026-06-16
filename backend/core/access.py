"""Access-control helpers for premium and feature-level entitlements."""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from fastapi import BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from core.config import settings
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.feature import Feature
from models.user import User
from services.analytics_events import (
    MonetizationEventType,
    persist_analytics_event,
)
from services.feature_flags import get_feature_by_key
from services.subscriptions.lifecycle import enforce_subscription_status
from services.user_segmentation import classify_user_for_feature

FeatureAccessReason = Literal[
    "free_feature",
    "temporary_override",
    "premium_subscription",
    "admin_bypass",
    "experiment_rollout",
    "trial_remaining",
    "locked",
    "trial_exhausted",
]


@dataclass(slots=True)
class FeatureAccessSnapshot:
    allowed: bool
    reason: FeatureAccessReason
    remaining_trial_uses: int | None = None
    usage_count: int = 0
    rollout_eligible: bool = False
    experiment_variant: str | None = None
    user_segment: str | None = None
    recommended_prompt_intensity: str | None = None
    effective_trial_limit: int | None = None


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_rollout_percentage(value: int | None) -> int:
    if value is None:
        return 0
    return max(0, min(int(value), 100))


def _resolve_feature_rollout_bucket(user: User | None, feature: Feature) -> int | None:
    if user is None:
        return None

    rollout_percentage = _normalize_rollout_percentage(feature.rollout_percentage)
    if rollout_percentage <= 0:
        return None

    seed = f"{feature.experiment_group or feature.key}:{user.id}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 100


def is_user_in_feature_rollout(user: User | None, feature: Feature) -> bool:
    bucket = _resolve_feature_rollout_bucket(user, feature)
    if bucket is None:
        return False
    return bucket < _normalize_rollout_percentage(feature.rollout_percentage)


def has_active_premium_subscription(
    user: User | None,
    *,
    now_utc: datetime | None = None,
) -> bool:
    if user is None:
        return False
    if user.is_admin:
        return True
    if not user.is_premium:
        return False

    expires_at = _ensure_utc(user.subscription_expires_at)
    if expires_at is None:
        return True
    current_time = now_utc or _utc_now()
    return expires_at > current_time


def has_access(
    user: User | None,
    feature: Feature,
    *,
    now_utc: datetime | None = None,
) -> bool:
    current_time = now_utc or _utc_now()

    if not feature.is_premium:
        return True

    if user is not None and user.is_admin:
        return True

    enabled_for_all_until = _ensure_utc(feature.enabled_for_all_until)
    if enabled_for_all_until is not None and current_time < enabled_for_all_until:
        return True

    if has_active_premium_subscription(user, now_utc=current_time):
        return True

    return is_user_in_feature_rollout(user, feature)


async def get_feature_usage_count(
    db: AsyncSession,
    *,
    user: User | None,
    feature_key: str,
) -> int:
    if user is None:
        return 0

    usage_stmt = select(func.count(AnalyticsEvent.id)).where(
        AnalyticsEvent.user_id == user.id,
        AnalyticsEvent.event_type == MonetizationEventType.FEATURE_USED.value,
        AnalyticsEvent.feature_key == feature_key,
    )
    usage_count = await db.scalar(usage_stmt)
    return int(usage_count or 0)


async def resolve_feature_access(
    user: User | None,
    feature: Feature,
    *,
    db: AsyncSession,
    now_utc: datetime | None = None,
) -> FeatureAccessSnapshot:
    current_time = now_utc or _utc_now()

    if not feature.is_premium:
        return FeatureAccessSnapshot(allowed=True, reason="free_feature")

    if user is not None and user.is_admin:
        return FeatureAccessSnapshot(allowed=True, reason="admin_bypass")

    enabled_for_all_until = _ensure_utc(feature.enabled_for_all_until)
    if enabled_for_all_until is not None and current_time < enabled_for_all_until:
        return FeatureAccessSnapshot(allowed=True, reason="temporary_override")

    if has_active_premium_subscription(user, now_utc=current_time):
        return FeatureAccessSnapshot(allowed=True, reason="premium_subscription")

    rollout_eligible = is_user_in_feature_rollout(user, feature)
    if rollout_eligible:
        return FeatureAccessSnapshot(
            allowed=True,
            reason="experiment_rollout",
            rollout_eligible=True,
            experiment_variant="enabled",
        )

    segment_snapshot = await classify_user_for_feature(
        db,
        user=user,
        feature_key=feature.key,
        now_utc=current_time,
    )
    usage_limit = feature.feature_usage_limit if feature.feature_usage_limit and feature.feature_usage_limit > 0 else None
    if segment_snapshot is not None and segment_snapshot.default_trial_limit is not None:
        usage_limit = max(usage_limit or 0, segment_snapshot.default_trial_limit)

    if usage_limit is not None and user is not None:
        usage_count = (
            segment_snapshot.usage_count
            if segment_snapshot is not None
            else await get_feature_usage_count(db, user=user, feature_key=feature.key)
        )
        remaining_trial_uses = max(usage_limit - usage_count, 0)
        if remaining_trial_uses > 0:
            return FeatureAccessSnapshot(
                allowed=True,
                reason="trial_remaining",
                remaining_trial_uses=remaining_trial_uses,
                usage_count=usage_count,
                experiment_variant="trial",
                user_segment=segment_snapshot.segment if segment_snapshot is not None else None,
                recommended_prompt_intensity=(
                    segment_snapshot.recommended_prompt_intensity if segment_snapshot is not None else None
                ),
                effective_trial_limit=usage_limit,
            )
        return FeatureAccessSnapshot(
            allowed=False,
            reason="trial_exhausted",
            remaining_trial_uses=0,
            usage_count=usage_count,
            experiment_variant="trial",
            user_segment=segment_snapshot.segment if segment_snapshot is not None else None,
            recommended_prompt_intensity=(
                segment_snapshot.recommended_prompt_intensity if segment_snapshot is not None else None
            ),
            effective_trial_limit=usage_limit,
        )

    return FeatureAccessSnapshot(
        allowed=False,
        reason="locked",
        rollout_eligible=False,
        usage_count=segment_snapshot.usage_count if segment_snapshot is not None else 0,
        experiment_variant=(
            "control" if _normalize_rollout_percentage(feature.rollout_percentage) > 0 else None
        ),
        user_segment=segment_snapshot.segment if segment_snapshot is not None else None,
        recommended_prompt_intensity=(
            segment_snapshot.recommended_prompt_intensity if segment_snapshot is not None else None
        ),
    )


def build_feature_access_metadata(
    *,
    feature: Feature,
    snapshot: FeatureAccessSnapshot,
    request_path: str,
) -> dict[str, object]:
    remaining_after_request: int | None = snapshot.remaining_trial_uses
    if snapshot.allowed and snapshot.reason == "trial_remaining" and snapshot.remaining_trial_uses is not None:
        remaining_after_request = max(snapshot.remaining_trial_uses - 1, 0)

    return {
        "source": "feature_access_dependency",
        "request_path": request_path,
        "access_reason": snapshot.reason,
        "remaining_trial_uses": snapshot.remaining_trial_uses,
        "remaining_trial_uses_after_request": remaining_after_request,
        "trial_usage_count": snapshot.usage_count,
        "experiment_group": feature.experiment_group,
        "experiment_variant": snapshot.experiment_variant,
        "rollout_percentage": _normalize_rollout_percentage(feature.rollout_percentage),
        "rollout_eligible": snapshot.rollout_eligible,
        "user_segment": snapshot.user_segment,
        "recommended_prompt_intensity": snapshot.recommended_prompt_intensity,
        "effective_trial_limit": snapshot.effective_trial_limit,
    }


def _queue_feature_access_event(
    background_tasks: BackgroundTasks,
    *,
    user_id,
    event_type: MonetizationEventType,
    feature: Feature,
    metadata: dict[str, object],
) -> None:
    if settings.ENVIRONMENT == "testing":
        return

    background_tasks.add_task(
        persist_analytics_event,
        user_id=user_id,
        event_type=event_type.value,
        feature_key=feature.key,
        metadata=metadata,
    )


async def _require_feature_access(
    *,
    feature_key: str,
    current_user: User,
    db: AsyncSession,
    request: Request,
    background_tasks: BackgroundTasks,
) -> Feature:
    feature = await get_feature_by_key(db, feature_key)
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature '{feature_key}' not found.",
        )

    if feature.is_premium:
        await enforce_subscription_status(user=current_user, db=db)

    snapshot = await resolve_feature_access(current_user, feature, db=db)
    metadata = build_feature_access_metadata(
        feature=feature,
        snapshot=snapshot,
        request_path=request.url.path,
    )

    if snapshot.allowed:
        _queue_feature_access_event(
            background_tasks,
            user_id=current_user.id,
            event_type=MonetizationEventType.FEATURE_USED,
            feature=feature,
            metadata=metadata,
        )
        return feature

    _queue_feature_access_event(
        background_tasks,
        user_id=current_user.id,
        event_type=MonetizationEventType.PREMIUM_BLOCK_VIEW,
        feature=feature,
        metadata=metadata,
    )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error": "premium_required",
            "feature": feature.key,
        },
    )


def require_feature_access(feature_key: str) -> Callable[..., Feature]:
    async def dependency(
        request: Request,
        background_tasks: BackgroundTasks,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> Feature:
        return await _require_feature_access(
            feature_key=feature_key,
            current_user=current_user,
            db=db,
            request=request,
            background_tasks=background_tasks,
        )

    dependency.__name__ = f"require_feature_access_{feature_key}"
    return dependency


async def ensure_premium_user(current_user: User, db: AsyncSession) -> User:
    """Ensure the current user has premium access, with admin bypass."""
    if current_user.is_admin:
        return current_user

    await enforce_subscription_status(user=current_user, db=db)
    if has_active_premium_subscription(current_user):
        return current_user

    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="Premium subscription required.",
    )


async def require_premium_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency for legacy premium-only endpoints."""
    return await ensure_premium_user(current_user, db)
