"""Experiment assignment endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from database.session import get_db
from models.user import User
from services.experiments import get_user_experiment_variants

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("", response_model=dict[str, str])
async def get_experiments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Return stable active experiment assignments for the authenticated user."""

    assignments = await get_user_experiment_variants(db, user_id=current_user.id)
    await db.commit()
    return assignments
