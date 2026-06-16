"""
User domain services.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.rbac import get_effective_role_names
from models.driving_instructor import DrivingInstructor
from models.driving_school import DrivingSchool
from models.user import User


def build_achievement_payload(achievement) -> dict:
    """Normalize an achievement ORM row into the API payload shape."""

    definition = achievement.achievement_definition
    return {
        "id": achievement.id,
        "name": definition.name,
        "description": definition.description,
        "icon": definition.icon,
        "trigger_rule": definition.trigger_rule,
        "awarded_at": achievement.awarded_at,
    }


async def build_current_user_profile(
    *,
    current_user: User,
    db: AsyncSession,
) -> dict:
    """Assemble the authenticated user's profile response."""

    instructor_result = await db.execute(
        select(DrivingInstructor.id).where(DrivingInstructor.user_id == current_user.id)
    )
    school_result = await db.execute(
        select(DrivingSchool.id).where(DrivingSchool.owner_user_id == current_user.id)
    )
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
        "subscription_expires_at": current_user.subscription_expires_at,
        "has_instructor_profile": instructor_result.scalar_one_or_none() is not None,
        "has_school_profile": school_result.scalar_one_or_none() is not None,
        "created_at": current_user.created_at,
    }


__all__ = [
    "build_achievement_payload",
    "build_current_user_profile",
]
