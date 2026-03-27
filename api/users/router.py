"""
AUTOTEST User Router
Endpoints for user profile and management
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.users.schemas import (
    AchievementItemResponse,
    ActiveXPBoostResponse,
    AchievementListResponse,
    CoinBalanceResponse,
    GamificationSummaryResponse,
    StreakResponse,
    UserMeResponse,
    XPSummaryResponse,
)
from database.session import get_db
from models.driving_instructor import DrivingInstructor
from models.driving_school import DrivingSchool
from models.user import User
from services.gamification.rewards import build_gamification_summary, get_full_achievements

router = APIRouter(prefix="/users", tags=["users"])


def _achievement_payload(achievement) -> AchievementItemResponse:
    definition = achievement.achievement_definition
    return AchievementItemResponse(
        id=achievement.id,
        name=definition.name,
        description=definition.description,
        icon=definition.icon,
        trigger_rule=definition.trigger_rule,
        awarded_at=achievement.awarded_at,
    )


@router.get("/me", response_model=UserMeResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get current user profile.
    """
    instructor_result = await db.execute(
        select(DrivingInstructor.id).where(DrivingInstructor.user_id == current_user.id)
    )
    school_result = await db.execute(
        select(DrivingSchool.id).where(DrivingSchool.owner_user_id == current_user.id)
    )
    from core.rbac import get_effective_role_names

    roles = await get_effective_role_names(current_user, db)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
        "roles": roles,
        "is_premium": current_user.is_premium,
        "has_instructor_profile": instructor_result.scalar_one_or_none() is not None,
        "has_school_profile": school_result.scalar_one_or_none() is not None,
        "created_at": current_user.created_at,
    }


@router.get("/me/xp", response_model=XPSummaryResponse)
async def get_my_xp(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> XPSummaryResponse:
    summary = await build_gamification_summary(db, current_user.id)
    await db.commit()
    return XPSummaryResponse(**summary["xp"])


@router.get("/me/coins", response_model=CoinBalanceResponse)
async def get_my_coins(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CoinBalanceResponse:
    summary = await build_gamification_summary(db, current_user.id)
    await db.commit()
    return CoinBalanceResponse(**summary["coins"])


@router.get("/me/streak", response_model=StreakResponse)
async def get_my_streak(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreakResponse:
    summary = await build_gamification_summary(db, current_user.id)
    await db.commit()
    return StreakResponse(**summary["streak"])


@router.get("/me/achievements", response_model=AchievementListResponse)
async def get_my_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AchievementListResponse:
    achievements = await get_full_achievements(db, current_user.id)
    await db.commit()
    return AchievementListResponse(
        achievements=[_achievement_payload(achievement) for achievement in achievements]
    )


@router.get("/me/gamification", response_model=GamificationSummaryResponse)
async def get_my_gamification_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GamificationSummaryResponse:
    summary = await build_gamification_summary(db, current_user.id)
    await db.commit()
    return GamificationSummaryResponse(
        xp=XPSummaryResponse(**summary["xp"]),
        coins=CoinBalanceResponse(**summary["coins"]),
        streak=StreakResponse(**summary["streak"]),
        active_xp_boost=ActiveXPBoostResponse(**summary["active_xp_boost"]) if summary["active_xp_boost"] else None,
        recent_achievements=[_achievement_payload(item) for item in summary["recent_achievements"]],
    )
