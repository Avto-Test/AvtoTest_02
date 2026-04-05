from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from api.ml_admin.schemas import (
    BuildDatasetResponse,
    MLAdminDashboardResponse,
    MLAdminLoginRequest,
    MLAdminSessionResponse,
    TrainModelResponse,
)
from core.rbac import SUPER_ADMIN_ROLE, RBACContext, require_role
from database.session import get_db
from services.ml_data.admin_service import build_ml_admin_dashboard
from services.ml_data.auth import (
    assert_ml_admin_enabled,
    create_ml_admin_token,
    ml_admin_password_configured,
    require_ml_admin_session,
    validate_ml_admin_password,
    verify_ml_admin_token,
)
from services.ml_data.dataset_builder import build_ml_dataset, export_ml_dataset_csv
from services.ml_data.training_pipeline import run_manual_training_placeholder

router = APIRouter(prefix="/ml-admin", tags=["ml-admin"])


def _expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=12)


@router.post("/auth/login", response_model=MLAdminSessionResponse)
async def ml_admin_login(
    payload: MLAdminLoginRequest,
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
) -> MLAdminSessionResponse:
    validate_ml_admin_password(payload.password)
    return MLAdminSessionResponse(
        enabled=True,
        authenticated=True,
        token=create_ml_admin_token(user_id=context.user.id),
        expires_at=_expires_at(),
    )


@router.get("/auth/status", response_model=MLAdminSessionResponse)
async def ml_admin_status(
    request: Request,
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
) -> MLAdminSessionResponse:
    if not ml_admin_password_configured():
        return MLAdminSessionResponse(enabled=False, authenticated=False)

    token = request.headers.get("x-ml-admin-token", "").strip()
    payload = verify_ml_admin_token(token) if token else None
    authenticated = payload is not None and payload.get("sub") == str(context.user.id)
    return MLAdminSessionResponse(enabled=True, authenticated=authenticated)


@router.post("/auth/logout", response_model=MLAdminSessionResponse)
async def ml_admin_logout(
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
) -> MLAdminSessionResponse:
    assert_ml_admin_enabled()
    return MLAdminSessionResponse(enabled=True, authenticated=False)


@router.get("/dashboard", response_model=MLAdminDashboardResponse)
async def get_ml_admin_dashboard(
    request: Request,
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> MLAdminDashboardResponse:
    require_ml_admin_session(request, user_id=context.user.id)
    dashboard = await build_ml_admin_dashboard(db)
    return MLAdminDashboardResponse(**dashboard)


@router.post("/dataset/build", response_model=BuildDatasetResponse)
async def trigger_dataset_build(
    request: Request,
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> BuildDatasetResponse:
    require_ml_admin_session(request, user_id=context.user.id)
    summary = await build_ml_dataset(db)
    await db.commit()
    return BuildDatasetResponse(**summary.__dict__)


@router.get("/dataset/export")
async def export_dataset(
    request: Request,
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_ml_admin_session(request, user_id=context.user.id)
    output_path, csv_text = await export_ml_dataset_csv(db)
    filename = output_path.replace("\\", "/").split("/")[-1]
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/train", response_model=TrainModelResponse)
async def trigger_training_placeholder(
    request: Request,
    context: RBACContext = Depends(require_role(SUPER_ADMIN_ROLE)),
    db: AsyncSession = Depends(get_db),
) -> TrainModelResponse:
    require_ml_admin_session(request, user_id=context.user.id)
    result = await run_manual_training_placeholder(db)
    return TrainModelResponse(**result.__dict__)
