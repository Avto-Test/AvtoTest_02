"""
User domain schemas.
"""

from api.auth.schemas import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    ResendVerificationRequest,
    Token,
    UserCreate,
    UserLogin,
    VerifyEmail,
)
from api.users.schemas import (
    AchievementItemResponse,
    AchievementListResponse,
    ActiveXPBoostResponse,
    CoinBalanceResponse,
    GamificationSummaryResponse,
    StreakResponse,
    UserMeResponse,
    XPSummaryResponse,
)

__all__ = [
    "AchievementItemResponse",
    "AchievementListResponse",
    "ActiveXPBoostResponse",
    "CoinBalanceResponse",
    "ForgotPasswordRequest",
    "GamificationSummaryResponse",
    "MessageResponse",
    "ResetPasswordRequest",
    "ResendVerificationRequest",
    "StreakResponse",
    "Token",
    "UserCreate",
    "UserLogin",
    "UserMeResponse",
    "VerifyEmail",
    "XPSummaryResponse",
]
