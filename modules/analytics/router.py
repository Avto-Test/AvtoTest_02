"""
Analytics domain router entrypoints.
"""

from api.analytics.admin_router import router as admin_router
from api.analytics.legacy_router import router as legacy_router
from api.analytics.user_router import router as user_router

__all__ = [
    "admin_router",
    "legacy_router",
    "user_router",
]
