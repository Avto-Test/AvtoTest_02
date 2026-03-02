"""
AUTOTEST Notifications Router
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.notifications.schemas import NotificationResponse
from database.session import get_db
from models.user import User
from models.user_notification import UserNotification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserNotification]:
    safe_limit = min(max(1, limit), 100)
    stmt = (
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(safe_limit)
    )
    if unread_only:
        stmt = stmt.where(UserNotification.is_read == False)  # noqa: E712

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(UserNotification).where(
            UserNotification.id == notification_id,
            UserNotification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    await db.commit()


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == current_user.id,
            UserNotification.is_read == False,  # noqa: E712
        )
    )
    notifications = list(result.scalars().all())
    for notification in notifications:
        notification.is_read = True
    if notifications:
        await db.commit()

