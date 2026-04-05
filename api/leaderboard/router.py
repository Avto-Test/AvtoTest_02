"""
AUTOTEST Leaderboard Router
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.leaderboard.schemas import (
    LeaderboardEntryResponse,
    LeaderboardPeriod,
    LeaderboardResponse,
    MyLeaderboardResponse,
)
from database.session import get_db
from models.user import User
from services.gamification.rewards import get_leaderboard_me, get_leaderboard_rows

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def _display_name(user: User) -> str:
    if user.full_name:
        return user.full_name
    return user.email.split("@", 1)[0]


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    period: LeaderboardPeriod = Query(default="weekly"),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LeaderboardResponse:
    rows, captured_at = await get_leaderboard_rows(db, period=period, limit=limit)
    await db.commit()
    return LeaderboardResponse(
        period=period,
        captured_at=captured_at,
        users=[
            LeaderboardEntryResponse(
                rank=snapshot.rank,
                user_id=snapshot.user_id,
                display_name=_display_name(user),
                xp_gained=snapshot.xp,
                is_current_user=snapshot.user_id == current_user.id,
            )
            for snapshot, user in rows
        ],
    )


@router.get("/me", response_model=MyLeaderboardResponse)
async def get_my_leaderboard_position(
    period: LeaderboardPeriod = Query(default="weekly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MyLeaderboardResponse:
    snapshot, captured_at = await get_leaderboard_me(db, user_id=current_user.id, period=period)
    await db.commit()
    return MyLeaderboardResponse(
        period=period,
        captured_at=captured_at,
        rank=snapshot.rank if snapshot else None,
        xp_gained=snapshot.xp if snapshot else 0,
    )
