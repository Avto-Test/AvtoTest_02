"""
School domain schemas.
"""

from api.driving_schools.schemas import *  # noqa: F401,F403
from api.school_schemas import (
    SchoolDashboardResponse,
    SchoolGroupMemberResponse,
    SchoolGroupResponse,
)

__all__ = [
    "SchoolDashboardResponse",
    "SchoolGroupMemberResponse",
    "SchoolGroupResponse",
]
