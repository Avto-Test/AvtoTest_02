"""
AUTOTEST School RBAC Router
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.school_schemas import (
    SchoolDashboardResponse,
    SchoolGroupMemberResponse,
    SchoolGroupResponse,
)
from core.rbac import (
    INSTRUCTOR_ROLE,
    RBACContext,
    SCHOOL_ADMIN_ROLE,
    SCHOOL_VIEW_DASHBOARD,
    SCHOOL_VIEW_GROUPS,
    SUPER_ADMIN_ROLE,
    require_permission,
)
from database.session import get_db
from models.driving_school import DrivingSchool
from models.driving_school_lead import DrivingSchoolLead
from models.role import Role
from models.school_membership import SchoolMembership
from models.user import User

router = APIRouter(prefix="/school", tags=["school"])


def _resolve_school_id_or_400(context: RBACContext, requested_school_id: UUID | None) -> UUID:
    school_id = requested_school_id or context.school_id
    if school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="school_id is required for this endpoint",
        )
    return school_id


def _active_role_for_school(context: RBACContext, school_id: UUID) -> str:
    for role_name in (SCHOOL_ADMIN_ROLE, INSTRUCTOR_ROLE, SUPER_ADMIN_ROLE):
        if context.has_role(role_name, school_id):
            return role_name
    for assignment in context.assignments:
        if assignment.school_id == school_id:
            return assignment.name
    for assignment in context.assignments:
        if assignment.school_id is None:
            return assignment.name
    return "Unknown"


@router.get("/dashboard", response_model=SchoolDashboardResponse)
async def get_school_dashboard(
    school_id: UUID | None = Query(default=None),
    context: RBACContext = Depends(require_permission(SCHOOL_VIEW_DASHBOARD)),
    db: AsyncSession = Depends(get_db),
) -> SchoolDashboardResponse:
    resolved_school_id = _resolve_school_id_or_400(context, school_id)

    school_result = await db.execute(
        select(DrivingSchool).where(DrivingSchool.id == resolved_school_id)
    )
    school = school_result.scalar_one_or_none()
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    member_count = await db.scalar(
        select(func.count(SchoolMembership.id)).where(SchoolMembership.school_id == resolved_school_id)
    )
    group_count = await db.scalar(
        select(func.count(distinct(SchoolMembership.group_id))).where(
            SchoolMembership.school_id == resolved_school_id,
            SchoolMembership.group_id.is_not(None),
        )
    )
    lead_count = await db.scalar(
        select(func.count(DrivingSchoolLead.id)).where(DrivingSchoolLead.school_id == resolved_school_id)
    )

    return SchoolDashboardResponse(
        school_id=school.id,
        school_name=school.name,
        active_role=_active_role_for_school(context, school.id),
        member_count=int(member_count or 0),
        group_count=int(group_count or 0),
        lead_count=int(lead_count or 0),
    )


@router.get("/groups/{group_id}", response_model=SchoolGroupResponse)
async def get_school_group(
    group_id: UUID,
    school_id: UUID | None = Query(default=None),
    context: RBACContext = Depends(require_permission(SCHOOL_VIEW_GROUPS)),
    db: AsyncSession = Depends(get_db),
) -> SchoolGroupResponse:
    resolved_school_id = _resolve_school_id_or_400(context, school_id)

    rows = await db.execute(
        select(SchoolMembership, User, Role.name)
        .join(User, User.id == SchoolMembership.user_id)
        .join(Role, Role.id == SchoolMembership.role_id)
        .where(
            SchoolMembership.school_id == resolved_school_id,
            SchoolMembership.group_id == group_id,
        )
        .order_by(SchoolMembership.joined_at.asc())
    )
    items = rows.all()
    if not items:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School group not found")

    members = [
        SchoolGroupMemberResponse(
            user_id=membership.user_id,
            email=user.email,
            full_name=user.full_name,
            role=role_name,
            school_id=membership.school_id,
            group_id=membership.group_id,
            joined_at=membership.joined_at,
        )
        for membership, user, role_name in items
    ]
    return SchoolGroupResponse(
        group_id=group_id,
        school_id=resolved_school_id,
        member_count=len(members),
        members=members,
    )
