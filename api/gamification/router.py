"""Live reward endpoints for answer-by-answer practice UX."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.attempts.schemas import RewardAchievement
from api.auth.router import get_current_user
from api.gamification.schemas import RewardQuestionRequest, RewardQuestionResponse
from api.users.schemas import (
    ActiveXPBoostResponse,
    CoinBalanceResponse,
    GamificationSummaryResponse,
    StreakResponse,
    XPSummaryResponse,
)
from database.session import get_db
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.question import Question
from models.user import User
from services.gamification.reward_policy import build_answer_reward_policy
from services.gamification.rewards import award_custom_reward, build_gamification_summary

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.post("/reward", response_model=RewardQuestionResponse)
async def reward_answer(
    payload: RewardQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RewardQuestionResponse:
    attempt = (
        await db.execute(select(Attempt).where(Attempt.id == payload.attempt_id))
    ).scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this attempt.")

    answer = (
        await db.execute(
            select(AttemptAnswer).where(
                AttemptAnswer.attempt_id == payload.attempt_id,
                AttemptAnswer.question_id == payload.question_id,
            )
        )
    ).scalar_one_or_none()
    if answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer must be saved before rewards are granted.")

    question = (
        await db.execute(
            select(Question)
            .options(
                selectinload(Question.answer_options),
                selectinload(Question.category_ref),
            )
            .where(Question.id == payload.question_id)
        )
    ).scalar_one_or_none()
    reward_policy = build_answer_reward_policy(
        mode=attempt.mode,
        is_correct=bool(answer.is_correct),
        difficulty_percent=getattr(question, "difficulty_percent", None),
        difficulty_label=getattr(question, "difficulty", None),
    )
    source = f"practice_answer_reward:{attempt.mode}:{payload.attempt_id}:{payload.question_id}"
    grant = await award_custom_reward(
        db,
        current_user.id,
        xp_amount=reward_policy.xp_amount,
        coins_amount=reward_policy.coins_amount,
        source=source,
    )
    summary = await build_gamification_summary(db, current_user.id)
    await db.commit()

    return RewardQuestionResponse(
        question_id=payload.question_id,
        xp_awarded=grant.xp_awarded,
        coins_awarded=grant.coins_awarded,
        achievements=[
            RewardAchievement(
                id=getattr(achievement, "id", None),
                name=achievement.achievement_definition.name,
                icon=achievement.achievement_definition.icon,
            )
            for achievement in grant.unlocked_achievements
        ],
        gamification=GamificationSummaryResponse(
            xp=XPSummaryResponse(**summary["xp"]),
            coins=CoinBalanceResponse(**summary["coins"]),
            streak=StreakResponse(**summary["streak"]),
            active_xp_boost=ActiveXPBoostResponse(**summary["active_xp_boost"]) if summary["active_xp_boost"] else None,
            recent_achievements=[
                {
                    "id": achievement.id,
                    "name": achievement.achievement_definition.name,
                    "description": achievement.achievement_definition.description,
                    "icon": achievement.achievement_definition.icon,
                    "trigger_rule": achievement.achievement_definition.trigger_rule,
                    "awarded_at": achievement.awarded_at,
                }
                for achievement in summary["recent_achievements"]
            ],
        ),
    )
