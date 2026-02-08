"""
AUTOTEST User Router
Endpoints for user profile and management
"""

from fastapi import APIRouter, Depends

from api.auth.router import get_current_user
from api.users.schemas import UserMeResponse
from models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current user profile.
    """
    return current_user
