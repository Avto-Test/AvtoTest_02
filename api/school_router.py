"""
AUTOTEST School RBAC Router
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.rbac import RBACContext, SCHOOL_VIEW_DASHBOARD, SCHOOL_VIEW_GROUPS, require_permission
from database.session import get_db
from modules.schools.schemas import (
    SchoolDashboardResponse,
    SchoolGroupResponse,
)
from modules.schools.service import build_school_dashboard_response, build_school_group_response

router = APIRouter(prefix="/school", tags=["school"])


@router.get("/dashboard", response_model=SchoolDashboardResponse)
async def get_school_dashboard(
    school_id: UUID | None = Query(default=None),
    context: RBACContext = Depends(require_permission(SCHOOL_VIEW_DASHBOARD)),
    db: AsyncSession = Depends(get_db),
) -> SchoolDashboardResponse:
    return await build_school_dashboard_response(
        school_id=school_id,
        context=context,
        db=db,
    )


@router.get("/groups/{group_id}", response_model=SchoolGroupResponse)
async def get_school_group(
    group_id: UUID,
    school_id: UUID | None = Query(default=None),
    context: RBACContext = Depends(require_permission(SCHOOL_VIEW_GROUPS)),
    db: AsyncSession = Depends(get_db),
) -> SchoolGroupResponse:
    return await build_school_group_response(
        group_id=group_id,
        school_id=school_id,
        context=context,
        db=db,
    )
