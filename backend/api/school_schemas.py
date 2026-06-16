"""
AUTOTEST School RBAC Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SchoolDashboardResponse(BaseModel):
    """School dashboard summary for RBAC-protected endpoints."""

    school_id: UUID
    school_name: str
    active_role: str
    member_count: int
    group_count: int
    lead_count: int


class SchoolGroupMemberResponse(BaseModel):
    """Member record within a school group."""

    user_id: UUID
    email: str
    full_name: str | None
    role: str
    school_id: UUID
    group_id: UUID | None
    joined_at: datetime


class SchoolGroupResponse(BaseModel):
    """School group detail payload."""

    group_id: UUID
    school_id: UUID
    member_count: int
    members: list[SchoolGroupMemberResponse]
