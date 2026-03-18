"""
Reward policy helpers for learning-path progression and balanced coin economy.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

LEARNING_PASS_THRESHOLD = 70.0
LEARNING_GOOD_THRESHOLD = 85.0
LEARNING_PERFECT_THRESHOLD = 95.0

LEARNING_PATH_ANSWER_REWARD_RANGE = (3, 5)
REGULAR_TEST_ANSWER_REWARD_RANGE = (1, 2)
LEARNING_STEP_COMPLETION_REWARD_RANGE = (10, 20)
LEARNING_PATH_PERFECT_BONUS_COINS = 15

LearningMasteryTier = Literal["needs_work", "pass", "good", "perfect"]


@dataclass(slots=True)
class AnswerRewardPolicy:
    xp_amount: int
    coins_amount: int


@dataclass(slots=True)
class StepCompletionRewardPolicy:
    tier: LearningMasteryTier
    xp_amount: int
    coins_amount: int
    perfect_bonus_xp: int = 0
    perfect_bonus_coins: int = 0


def resolve_learning_mastery_tier(score_percent: float) -> LearningMasteryTier:
    if score_percent >= LEARNING_PERFECT_THRESHOLD:
        return "perfect"
    if score_percent >= LEARNING_GOOD_THRESHOLD:
        return "good"
    if score_percent >= LEARNING_PASS_THRESHOLD:
        return "pass"
    return "needs_work"


def _difficulty_bucket(
    *,
    difficulty_percent: int | None = None,
    difficulty_label: str | None = None,
) -> Literal["easy", "medium", "hard"]:
    if difficulty_percent is not None:
        safe_percent = max(0, min(100, int(difficulty_percent)))
        if safe_percent <= 33:
            return "hard"
        if safe_percent >= 67:
            return "easy"
        return "medium"

    normalized_label = (difficulty_label or "").strip().lower()
    if normalized_label == "hard":
        return "hard"
    if normalized_label == "easy":
        return "easy"
    return "medium"


def build_answer_reward_policy(
    *,
    mode: str,
    is_correct: bool,
    difficulty_percent: int | None = None,
    difficulty_label: str | None = None,
) -> AnswerRewardPolicy:
    if not is_correct:
        xp_amount = 3 if mode == "learning" else 1
        return AnswerRewardPolicy(xp_amount=xp_amount, coins_amount=0)

    difficulty_bucket = _difficulty_bucket(
        difficulty_percent=difficulty_percent,
        difficulty_label=difficulty_label,
    )

    if mode == "learning":
        coins_by_bucket = {
            "easy": LEARNING_PATH_ANSWER_REWARD_RANGE[0],
            "medium": 4,
            "hard": LEARNING_PATH_ANSWER_REWARD_RANGE[1],
        }
        xp_by_bucket = {
            "easy": 9,
            "medium": 10,
            "hard": 11,
        }
        return AnswerRewardPolicy(
            xp_amount=xp_by_bucket[difficulty_bucket],
            coins_amount=coins_by_bucket[difficulty_bucket],
        )

    coins_by_bucket = {
        "easy": REGULAR_TEST_ANSWER_REWARD_RANGE[0],
        "medium": 1,
        "hard": REGULAR_TEST_ANSWER_REWARD_RANGE[1],
    }
    xp_by_bucket = {
        "easy": 5,
        "medium": 6,
        "hard": 7,
    }
    return AnswerRewardPolicy(
        xp_amount=xp_by_bucket[difficulty_bucket],
        coins_amount=coins_by_bucket[difficulty_bucket],
    )


def build_learning_step_completion_reward(score_percent: float) -> StepCompletionRewardPolicy:
    tier = resolve_learning_mastery_tier(score_percent)

    if tier == "perfect":
        return StepCompletionRewardPolicy(
            tier=tier,
            xp_amount=22,
            coins_amount=LEARNING_STEP_COMPLETION_REWARD_RANGE[1],
            perfect_bonus_xp=8,
            perfect_bonus_coins=LEARNING_PATH_PERFECT_BONUS_COINS,
        )

    if tier == "good":
        return StepCompletionRewardPolicy(
            tier=tier,
            xp_amount=18,
            coins_amount=15,
        )

    if tier == "pass":
        return StepCompletionRewardPolicy(
            tier=tier,
            xp_amount=14,
            coins_amount=LEARNING_STEP_COMPLETION_REWARD_RANGE[0],
        )

    return StepCompletionRewardPolicy(
        tier=tier,
        xp_amount=0,
        coins_amount=0,
    )


def build_reward_policy_preview() -> dict[str, object]:
    return {
        "learning_path_answer": {
            "min_coins": LEARNING_PATH_ANSWER_REWARD_RANGE[0],
            "max_coins": LEARNING_PATH_ANSWER_REWARD_RANGE[1],
        },
        "learning_path_step": {
            "min_coins": LEARNING_STEP_COMPLETION_REWARD_RANGE[0],
            "max_coins": LEARNING_STEP_COMPLETION_REWARD_RANGE[1],
        },
        "learning_path_perfect_bonus": LEARNING_PATH_PERFECT_BONUS_COINS,
        "regular_test_answer": {
            "min_coins": REGULAR_TEST_ANSWER_REWARD_RANGE[0],
            "max_coins": REGULAR_TEST_ANSWER_REWARD_RANGE[1],
        },
        "regular_test_completion_bonus": 0,
    }
