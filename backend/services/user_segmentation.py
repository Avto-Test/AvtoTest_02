"""User monetization segmentation helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics_event import AnalyticsEvent
from models.user import User
from services.analytics_events import MonetizationEventType

UserSegment = Literal["new_user", "active_user", "power_user", "standard_user"]
PromptIntensity = Literal["default", "aggressive"]

NEW_USER_WINDOW_DAYS = 3
ACTIVE_USAGE_THRESHOLD = 5
POWER_USAGE_THRESHOLD = 8
POWER_CLICK_THRESHOLD = 2
NEW_USER_DEFAULT_TRIAL_LIMIT = 2


@dataclass(slots=True)
class UserSegmentSnapshot:
    segment: UserSegment
    usage_count: int = 0
    click_count: int = 0
    recommended_prompt_intensity: PromptIntensity = "default"
    default_trial_limit: int | None = None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _is_new_user(user: User, *, now_utc: datetime) -> bool:
    created_at = user.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    else:
        created_at = created_at.astimezone(timezone.utc)
    return created_at >= now_utc - timedelta(days=NEW_USER_WINDOW_DAYS)


async def classify_user_for_feature(
    db: AsyncSession,
    *,
    user: User | None,
    feature_key: str,
    now_utc: datetime | None = None,
) -> UserSegmentSnapshot | None:
    if user is None:
        return None

    current_time = now_utc or _utc_now()
    metrics_stmt = select(
        func.sum(
            case(
                (AnalyticsEvent.event_type == MonetizationEventType.FEATURE_USED.value, 1),
                else_=0,
            )
        ).label("usage_count"),
        func.sum(
            case(
                (
                    AnalyticsEvent.event_type.in_(
                        (
                            MonetizationEventType.UPGRADE_CLICK.value,
                            MonetizationEventType.FEATURE_LOCKED_CLICK.value,
                        )
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("click_count"),
    ).where(
        AnalyticsEvent.user_id == user.id,
        AnalyticsEvent.feature_key == feature_key,
    )

    row = (await db.execute(metrics_stmt)).mappings().one()
    usage_count = int(row["usage_count"] or 0)
    click_count = int(row["click_count"] or 0)

    if _is_new_user(user, now_utc=current_time):
        return UserSegmentSnapshot(
            segment="new_user",
            usage_count=usage_count,
            click_count=click_count,
            default_trial_limit=NEW_USER_DEFAULT_TRIAL_LIMIT,
        )

    if usage_count >= POWER_USAGE_THRESHOLD and click_count >= POWER_CLICK_THRESHOLD:
        return UserSegmentSnapshot(
            segment="power_user",
            usage_count=usage_count,
            click_count=click_count,
            recommended_prompt_intensity="aggressive",
        )

    if usage_count > ACTIVE_USAGE_THRESHOLD:
        return UserSegmentSnapshot(
            segment="active_user",
            usage_count=usage_count,
            click_count=click_count,
            recommended_prompt_intensity="aggressive",
        )

    return UserSegmentSnapshot(
        segment="standard_user",
        usage_count=usage_count,
        click_count=click_count,
    )
