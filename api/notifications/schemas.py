"""
AUTOTEST Notification Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """Notification payload for user bell/dropdown."""

    id: UUID
    notification_type: str
    title: str
    message: str
    payload: dict
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

