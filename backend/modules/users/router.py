"""
User domain router entrypoints.
"""

from api.admin.router import get_current_admin
from api.auth.router import (
    get_current_user,
    resolve_user_from_access_token,
    router as auth_router,
)
from api.users.router import (
    get_my_achievements,
    get_my_coins,
    get_my_gamification_summary,
    get_my_profile,
    get_my_streak,
    get_my_xp,
    router as profile_router,
)

router = profile_router

__all__ = [
    "auth_router",
    "get_current_admin",
    "get_current_user",
    "get_my_achievements",
    "get_my_coins",
    "get_my_gamification_summary",
    "get_my_profile",
    "get_my_streak",
    "get_my_xp",
    "profile_router",
    "resolve_user_from_access_token",
    "router",
]
