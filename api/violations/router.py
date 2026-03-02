"""
AUTOTEST Violations Router
Endpoints for logging proctoring/violation events
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import decode_access_token
from database.session import get_db
from models.user import User
from models.user_notification import UserNotification
from models.violation_log import ViolationLog

router = APIRouter(prefix="/violations", tags=["violations"])


def _normalize_uuid(value: object | None) -> UUID | None:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


async def _get_user_from_request(request: Request, db: AsyncSession) -> User | None:
    token: str | None = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    else:
        # Frontend may send auth token via cookie for lightweight fetch clients.
        token = request.cookies.get("access_token")

    if not token:
        return None

    user_id = decode_access_token(token)
    if not user_id:
        return None
    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        return None
    result = await db.execute(select(User).where(User.id == user_uuid))
    return result.scalar_one_or_none()


@router.post("/log")
async def log_violation(
    request: Request,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    event_type = payload.get("event_type")
    if not event_type or not isinstance(event_type, str):
        raise HTTPException(status_code=400, detail="event_type is required")

    user = await _get_user_from_request(request, db)
    guest_id = request.cookies.get("guest_id")
    details = payload.get("details") or {}
    if not isinstance(details, dict):
        details = {"raw_details": details}

    raw_test_id = payload.get("test_id")
    raw_attempt_id = payload.get("attempt_id")
    test_id = _normalize_uuid(raw_test_id)
    attempt_id = _normalize_uuid(raw_attempt_id)

    # Preserve non-UUID identifiers for debugging while keeping DB writes safe.
    if raw_test_id is not None and test_id is None:
        details["test_ref"] = str(raw_test_id)
    if raw_attempt_id is not None and attempt_id is None:
        details["attempt_ref"] = str(raw_attempt_id)

    log = ViolationLog(
        user_id=user.id if user else None,
        guest_id=guest_id,
        test_id=test_id,
        attempt_id=attempt_id,
        event_type=event_type,
        details=details,
    )
    db.add(log)

    if user is not None:
        payload_data = {
            "event_type": event_type,
            "test_id": str(test_id) if test_id else None,
            "attempt_id": str(attempt_id) if attempt_id else None,
            "details": details,
        }
        db.add(
            UserNotification(
                user_id=user.id,
                notification_type="violation",
                title="Qoidabuzarlik aniqlandi",
                message=f"Test paytida '{event_type}' hodisasi qayd etildi.",
                payload=payload_data,
            )
        )

        admins_result = await db.execute(
            select(User).where(
                User.is_admin.is_(True),
                User.id != user.id,
            )
        )
        admins = list(admins_result.scalars().all())
        for admin in admins:
            db.add(
                UserNotification(
                    user_id=admin.id,
                    notification_type="violation_admin",
                    title="Yangi qoidabuzarlik",
                    message=f"{user.email} foydalanuvchisi testda '{event_type}' hodisasini keltirib chiqardi.",
                    payload={
                        **payload_data,
                        "violator_user_id": str(user.id),
                        "violator_email": user.email,
                    },
                )
            )

    await db.commit()
    return {"success": True}
