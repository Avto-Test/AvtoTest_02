"""
Promocode domain router entrypoints.
"""

from api.promocode_router import apply_promocode_endpoint, router

__all__ = [
    "apply_promocode_endpoint",
    "router",
]
