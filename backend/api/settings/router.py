"""Public settings router."""

from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from services.learning.simulation_service import get_or_create_simulation_exam_settings

router = APIRouter(prefix="/settings", tags=["settings"])


class IntroVideoResponse(BaseModel):
    intro_video_url: str | None = None


@router.get("/intro-video", response_model=IntroVideoResponse)
async def get_intro_video_setting(
    db: AsyncSession = Depends(get_db),
) -> IntroVideoResponse:
    settings = await get_or_create_simulation_exam_settings(db)
    return IntroVideoResponse(intro_video_url=settings.intro_video_url)
