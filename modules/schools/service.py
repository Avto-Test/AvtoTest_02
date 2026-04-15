"""
School domain services shared across school-facing routers.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.rbac import INSTRUCTOR_ROLE, RBACContext, SCHOOL_ADMIN_ROLE, SUPER_ADMIN_ROLE
from models.driving_school import DrivingSchool
from models.driving_school_lead import DrivingSchoolLead
from models.role import Role
from models.school_membership import SchoolMembership
from models.user import User
from modules.schools.schemas import (
    SchoolDashboardResponse,
    SchoolGroupMemberResponse,
    SchoolGroupResponse,
)


def resolve_school_id_or_400(context: RBACContext, requested_school_id: UUID | None) -> UUID:
    """Resolve the target school for an RBAC-protected request."""

    school_id = requested_school_id or context.school_id
    if school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="school_id is required for this endpoint",
        )
    return school_id


def active_role_for_school(context: RBACContext, school_id: UUID) -> str:
    """Return the active role label for a user within a school scope."""

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


async def build_school_dashboard_response(
    *,
    school_id: UUID | None,
    context: RBACContext,
    db: AsyncSession,
) -> SchoolDashboardResponse:
    """Build the RBAC-protected school dashboard payload."""

    resolved_school_id = resolve_school_id_or_400(context, school_id)
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
        active_role=active_role_for_school(context, school.id),
        member_count=int(member_count or 0),
        group_count=int(group_count or 0),
        lead_count=int(lead_count or 0),
    )


async def build_school_group_response(
    *,
    group_id: UUID,
    school_id: UUID | None,
    context: RBACContext,
    db: AsyncSession,
) -> SchoolGroupResponse:
    """Build a school group membership payload."""

    resolved_school_id = resolve_school_id_or_400(context, school_id)
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


__all__ = [
    "active_role_for_school",
    "build_school_dashboard_response",
    "build_school_group_response",
    "resolve_school_id_or_400",
]
