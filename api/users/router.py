"""
AUTOTEST User Router
Endpoints for user profile and management
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from database.session import get_db
from models.user import User
from modules.users.schemas import (
    AchievementItemResponse,
    ActiveXPBoostResponse,
    AchievementListResponse,
    CoinBalanceResponse,
    GamificationSummaryResponse,
    StreakResponse,
    UserMeResponse,
    XPSummaryResponse,
)
from modules.users.service import build_achievement_payload, build_current_user_profile
from services.gamification.rewards import build_gamification_summary, get_full_achievements

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserMeResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get current user profile.
    """
    return await build_current_user_profile(current_user=current_user, db=db)


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
        achievements=[
            AchievementItemResponse(**build_achievement_payload(achievement))
            for achievement in achievements
        ]
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
        recent_achievements=[
            AchievementItemResponse(**build_achievement_payload(item))
            for item in summary["recent_achievements"]
        ],
    )
