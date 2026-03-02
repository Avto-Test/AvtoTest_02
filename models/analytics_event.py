"""
AUTOTEST Analytics Event Model
Server-side analytics events for conversion funnel tracking.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


class AnalyticsEvent(Base):
    """Stores analytics events emitted by backend and frontend APIs."""

    __tablename__ = "analytics_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<AnalyticsEvent(id={self.id}, event_name={self.event_name}, user_id={self.user_id})>"
