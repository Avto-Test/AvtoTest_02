"""
Feature flag catalog endpoints.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import resolve_user_from_access_token
from api.features.schemas import FeatureResponse, FeatureUpdateRequest
from core.access import resolve_feature_access
from core.rbac import RBACContext, SUPER_ADMIN_ROLE, require_role
from database.session import get_db
from models.feature import Feature
from models.user import User
from services.feature_flags import ensure_feature_catalog
from services.subscriptions.lifecycle import enforce_subscription_status

router = APIRouter(prefix="/features", tags=["features"])


async def get_current_feature_admin(
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
):
    return context.user


async def _resolve_optional_feature_user(
    request: Request,
    db: AsyncSession,
) -> User | None:
    auth_header = request.headers.get("authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = request.cookies.get("access_token", "").strip()
    if not token:
        return None

    user = await resolve_user_from_access_token(token, db=db, include_subscription=True)
    if user is None or not user.is_active:
        return None

    await enforce_subscription_status(user=user, db=db)
    return user


@router.get("", response_model=list[FeatureResponse])
async def list_features(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> list[FeatureResponse]:
    features = await ensure_feature_catalog(db)
    current_user = await _resolve_optional_feature_user(request, db)

    responses: list[FeatureResponse] = []
    for feature in features:
        snapshot = await resolve_feature_access(current_user, feature, db=db)
        responses.append(
            FeatureResponse(
                id=feature.id,
                key=feature.key,
                name=feature.name,
                is_premium=feature.is_premium,
                enabled_for_all_until=feature.enabled_for_all_until,
                experiment_group=feature.experiment_group,
                rollout_percentage=feature.rollout_percentage,
                feature_usage_limit=feature.feature_usage_limit,
                current_price=feature.current_price,
                suggested_price_min=feature.suggested_price_min,
                suggested_price_max=feature.suggested_price_max,
                last_price_analysis_at=feature.last_price_analysis_at,
                has_access=snapshot.allowed,
                access_reason=snapshot.reason,
                remaining_trial_uses=snapshot.remaining_trial_uses,
                trial_usage_count=snapshot.usage_count,
                effective_trial_limit=snapshot.effective_trial_limit,
                rollout_eligible=snapshot.rollout_eligible,
                experiment_variant=snapshot.experiment_variant,
                user_segment=snapshot.user_segment,
                recommended_prompt_intensity=snapshot.recommended_prompt_intensity,
                created_at=feature.created_at,
            )
        )

    return responses


@router.patch("/{feature_id}", response_model=FeatureResponse)
async def update_feature(
    feature_id: UUID,
    payload: FeatureUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_feature_admin),
) -> Feature:
    await ensure_feature_catalog(db)
    result = await db.execute(select(Feature).where(Feature.id == feature_id))
    feature = result.scalar_one_or_none()
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found.",
        )

    fields_set = payload.model_fields_set
    if "is_premium" in fields_set and payload.is_premium is not None:
        feature.is_premium = payload.is_premium
    if "enabled_for_all_until" in fields_set:
        feature.enabled_for_all_until = payload.enabled_for_all_until
    if "experiment_group" in fields_set:
        normalized_group = (payload.experiment_group or "").strip().lower()
        feature.experiment_group = normalized_group or None
    if "rollout_percentage" in fields_set and payload.rollout_percentage is not None:
        feature.rollout_percentage = payload.rollout_percentage
    if "feature_usage_limit" in fields_set:
        feature.feature_usage_limit = payload.feature_usage_limit
    if "current_price" in fields_set:
        feature.current_price = payload.current_price

    await db.commit()
    await db.refresh(feature)
    return FeatureResponse.model_validate(
        {
            "id": feature.id,
            "key": feature.key,
            "name": feature.name,
            "is_premium": feature.is_premium,
            "enabled_for_all_until": feature.enabled_for_all_until,
            "experiment_group": feature.experiment_group,
            "rollout_percentage": feature.rollout_percentage,
            "feature_usage_limit": feature.feature_usage_limit,
            "current_price": feature.current_price,
            "suggested_price_min": feature.suggested_price_min,
            "suggested_price_max": feature.suggested_price_max,
            "last_price_analysis_at": feature.last_price_analysis_at,
            "created_at": feature.created_at,
        }
    )
