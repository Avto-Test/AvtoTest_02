"""
Compatibility shim for promocode schemas now exposed through `modules.promocodes`.
"""

from modules.promocodes.schemas import ApplyPromocodeRequest, ApplyPromocodeResponse

__all__ = [
    "ApplyPromocodeRequest",
    "ApplyPromocodeResponse",
]
