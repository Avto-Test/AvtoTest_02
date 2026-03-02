"""
AUTOTEST User Router
Endpoints for user profile and management
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.users.schemas import UserMeResponse
from database.session import get_db
from models.driving_instructor import DrivingInstructor
from models.driving_school import DrivingSchool
from models.user import User

router = APIRouter(prefix="/users", tags=["users"])


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
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
        "is_premium": current_user.is_premium,
        "has_instructor_profile": instructor_result.scalar_one_or_none() is not None,
        "has_school_profile": school_result.scalar_one_or_none() is not None,
        "created_at": current_user.created_at,
    }
