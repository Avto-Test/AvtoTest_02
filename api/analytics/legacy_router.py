"""Analytics endpoints for legacy and monetization tracking clients."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from api.admin.router import get_current_admin
from api.analytics.schemas import (
    DashboardResponse,
    FeatureFunnelResponse,
    FeaturePerformanceItem,
    MonetizationInsightItem,
    UserAnalyticsSummary,
)
from api.analytics.user_router import get_dashboard, get_user_summary
from api.auth.router import get_current_user, resolve_user_from_access_token
from core.config import settings
from database.session import get_db
from models.user import User
from services.analytics_events import (
    MONETIZATION_EVENT_TYPES,
    persist_analytics_event,
    record_analytics_event,
)
from services.monetization_insights import generate_monetization_insights
from services.monetization_analytics import get_feature_funnel, get_feature_performance

router = APIRouter(prefix="/analytics", tags=["analytics"])
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
MAX_BATCH_SIZE = 50


class TrackEventRequest(BaseModel):
    event: str | None = Field(default=None, max_length=100)
    event_type: str | None = Field(default=None, max_length=100)
    feature_key: str | None = Field(default=None, max_length=100)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_payload(self) -> "TrackEventRequest":
        normalized_event_type = (self.event_type or "").strip().lower()
        normalized_event = (self.event or "").strip().lower()

        if normalized_event_type:
            if normalized_event_type not in MONETIZATION_EVENT_TYPES:
                raise ValueError(
                    "Invalid event_type. Supported values: "
                    + ", ".join(sorted(MONETIZATION_EVENT_TYPES))
                )
            self.event_type = normalized_event_type
        elif normalized_event:
            self.event = normalized_event
        else:
            raise ValueError("Either event_type or event is required.")

        if self.feature_key is not None:
            normalized_feature_key = self.feature_key.strip().lower()
            self.feature_key = normalized_feature_key or None

        return self


async def _resolve_optional_user_id(
    token: str | None,
    db: AsyncSession,
) -> UUID | None:
    if not token:
        return None

    user = await resolve_user_from_access_token(token, db=db, include_subscription=False)
    if not user or not user.is_active:
        return None
    return user.id


@router.get("/summary", response_model=UserAnalyticsSummary)
async def get_user_summary_legacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserAnalyticsSummary:
    return await get_user_summary(current_user=current_user, db=db)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_legacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    return await get_dashboard(current_user=current_user, db=db)


@router.post("/track", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def track_event(
    payload: TrackEventRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme_optional),
) -> Response:
    user_id = await _resolve_optional_user_id(token, db)
    normalized_event_type = payload.event_type or payload.event
    if not normalized_event_type:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if settings.ENVIRONMENT == "testing":
        await record_analytics_event(
            db,
            user_id=user_id,
            event_type=normalized_event_type,
            feature_key=payload.feature_key,
            metadata=payload.metadata or {},
        )
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    background_tasks.add_task(
        persist_analytics_event,
        user_id=user_id,
        event_type=normalized_event_type,
        feature_key=payload.feature_key,
        metadata=payload.metadata or {},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/track/batch", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def track_event_batch(
    payloads: list[TrackEventRequest],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme_optional),
) -> Response:
    if not payloads:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    user_id = await _resolve_optional_user_id(token, db)

    if settings.ENVIRONMENT == "testing":
        for payload in payloads:
            normalized_event_type = payload.event_type or payload.event
            if not normalized_event_type:
                continue
            await record_analytics_event(
                db,
                user_id=user_id,
                event_type=normalized_event_type,
                feature_key=payload.feature_key,
                metadata=payload.metadata or {},
            )
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    for payload in payloads[:MAX_BATCH_SIZE]:
        normalized_event_type = payload.event_type or payload.event
        if not normalized_event_type:
            continue
        background_tasks.add_task(
            persist_analytics_event,
            user_id=user_id,
            event_type=normalized_event_type,
            feature_key=payload.feature_key,
            metadata=payload.metadata or {},
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/funnel", response_model=FeatureFunnelResponse)
async def get_funnel(
    feature: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> FeatureFunnelResponse:
    normalized_feature = (feature or "").strip().lower()
    if not normalized_feature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="feature query parameter is required.",
        )
    return await get_feature_funnel(db, feature_key=normalized_feature)


@router.get("/features", response_model=list[FeaturePerformanceItem])
async def get_feature_analytics(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[FeaturePerformanceItem]:
    return await get_feature_performance(db)


@router.get("/insights", response_model=list[MonetizationInsightItem])
async def get_monetization_insights(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[MonetizationInsightItem]:
    return await generate_monetization_insights(db)
