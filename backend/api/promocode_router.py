"""
AUTOTEST Promocode Linking Router
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from core.errors import AppError, get_request_id
from core.logger import log_info
from database.session import get_db
from models.user import User
from modules.promocodes.schemas import ApplyPromocodeRequest, ApplyPromocodeResponse
from modules.promocodes.service import (
    PROMOCODE_INVALID_ERROR_CODE,
    PromoCodeServiceError,
    apply_promocode,
)

router = APIRouter(tags=["promocode"])


@router.post("/api/promocode/apply", response_model=ApplyPromocodeResponse)
async def apply_promocode_endpoint(
    payload: ApplyPromocodeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplyPromocodeResponse:
    request_id = get_request_id(request)
    try:
        result = await apply_promocode(
            code=payload.code,
            user=current_user,
            db=db,
        )
    except PromoCodeServiceError as exc:
        raise AppError(
            request,
            error_code=PROMOCODE_INVALID_ERROR_CODE,
            message=exc.message,
            status_code=exc.status_code,
        ) from exc

    log_info(
        "promocode",
        "promo_applied",
        request_id,
        user_id=current_user.id,
        metadata={
            "promo_code": result.promo.code,
            "school_id": str(result.promo.school_id) if result.promo.school_id is not None else None,
            "group_id": str(result.promo.group_id) if result.promo.group_id is not None else None,
        },
    )

    return ApplyPromocodeResponse(
        success=True,
        discount_percent=result.discount_percent,
        school_linked=result.school_linked,
        group_assigned=result.group_assigned,
    )
