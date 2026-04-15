"""
School domain router entrypoints.
"""

from api.driving_schools.admin_router import router as admin_driving_schools_router
from api.driving_schools.router import router as driving_schools_router
from api.school_router import router as school_router

router = school_router

__all__ = [
    "admin_driving_schools_router",
    "driving_schools_router",
    "router",
    "school_router",
]
