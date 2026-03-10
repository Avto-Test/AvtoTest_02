"""
AUTOTEST RBAC Utilities
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from core.errors import AccessDeniedError, get_request_id
from core.logger import log_warning
from database.session import get_db
from models.driving_school import DrivingSchool
from models.permission import Permission
from models.role import Role
from models.role_permission import RolePermission
from models.school_membership import SchoolMembership
from models.user import User
from models.user_role import UserRole

SUPER_ADMIN_ROLE = "SuperAdmin"
SCHOOL_ADMIN_ROLE = "SchoolAdmin"
INSTRUCTOR_ROLE = "Instructor"
STUDENT_ROLE = "Student"

ADMIN_SCHOOLS_CREATE = "admin.schools.create"
ADMIN_USERS_READ = "admin.users.read"
SCHOOL_VIEW_DASHBOARD = "school.view_dashboard"
SCHOOL_VIEW_GROUPS = "school.view_groups"
SCHOOL_MANAGE_MEMBERS = "school.manage_members"

DEFAULT_ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    SUPER_ADMIN_ROLE: frozenset(
        {
            ADMIN_SCHOOLS_CREATE,
            ADMIN_USERS_READ,
            SCHOOL_VIEW_DASHBOARD,
            SCHOOL_VIEW_GROUPS,
            SCHOOL_MANAGE_MEMBERS,
        }
    ),
    SCHOOL_ADMIN_ROLE: frozenset(
        {
            SCHOOL_VIEW_DASHBOARD,
            SCHOOL_VIEW_GROUPS,
            SCHOOL_MANAGE_MEMBERS,
        }
    ),
    INSTRUCTOR_ROLE: frozenset(
        {
            SCHOOL_VIEW_DASHBOARD,
            SCHOOL_VIEW_GROUPS,
        }
    ),
    STUDENT_ROLE: frozenset(),
}


def _normalize_uuid(value: Any) -> UUID | None:
    if value is None or isinstance(value, UUID):
        return value

    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _scope_matches(assignment_school_id: UUID | None, school_id: UUID | None) -> bool:
    if assignment_school_id is None:
        return True
    return school_id is not None and assignment_school_id == school_id


@dataclass(frozen=True, slots=True)
class RoleAssignment:
    """Effective role assignment for a request."""

    name: str
    school_id: UUID | None = None
    source: str = "rbac"


@dataclass(slots=True)
class RBACContext:
    """Resolved RBAC state for the current request."""

    user: User
    school_id: UUID | None
    assignments: tuple[RoleAssignment, ...]
    role_permissions: dict[str, frozenset[str]]

    @property
    def roles(self) -> set[str]:
        return {assignment.name for assignment in self.assignments}

    def has_role(self, role_name: str, school_id: UUID | None = None) -> bool:
        requested_school_id = self.school_id if school_id is None else school_id
        normalized_role = role_name.strip()
        return any(
            assignment.name == normalized_role and _scope_matches(assignment.school_id, requested_school_id)
            for assignment in self.assignments
        )

    def has_permission(self, permission_name: str, school_id: UUID | None = None) -> bool:
        requested_school_id = self.school_id if school_id is None else school_id
        for assignment in self.assignments:
            if not _scope_matches(assignment.school_id, requested_school_id):
                continue
            if permission_name in self.role_permissions.get(assignment.name, frozenset()):
                return True
        return False


async def _load_persisted_assignments(current_user: User, db: AsyncSession) -> list[RoleAssignment]:
    assignments: list[RoleAssignment] = []

    user_role_rows = await db.execute(
        select(Role.name, UserRole.school_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == current_user.id)
    )
    assignments.extend(
        RoleAssignment(name=name, school_id=school_id, source="user_role")
        for name, school_id in user_role_rows.all()
    )

    membership_rows = await db.execute(
        select(Role.name, SchoolMembership.school_id)
        .join(SchoolMembership, SchoolMembership.role_id == Role.id)
        .where(SchoolMembership.user_id == current_user.id)
    )
    assignments.extend(
        RoleAssignment(name=name, school_id=school_id, source="school_membership")
        for name, school_id in membership_rows.all()
    )

    return assignments


async def _load_legacy_assignments(current_user: User, db: AsyncSession) -> list[RoleAssignment]:
    assignments = [RoleAssignment(name=STUDENT_ROLE, source="legacy_student")]

    if current_user.is_admin:
        assignments.append(RoleAssignment(name=SUPER_ADMIN_ROLE, source="legacy_admin"))

    owned_school_ids = await db.execute(
        select(DrivingSchool.id).where(DrivingSchool.owner_user_id == current_user.id)
    )
    assignments.extend(
        RoleAssignment(name=SCHOOL_ADMIN_ROLE, school_id=school_id, source="legacy_school_owner")
        for school_id in owned_school_ids.scalars().all()
    )

    return assignments


def _dedupe_assignments(assignments: list[RoleAssignment]) -> tuple[RoleAssignment, ...]:
    seen: set[tuple[str, UUID | None]] = set()
    deduped: list[RoleAssignment] = []
    for assignment in assignments:
        key = (assignment.name, assignment.school_id)
        if key in seen:
            continue
        deduped.append(assignment)
        seen.add(key)
    return tuple(deduped)


async def _load_role_permissions(assignments: tuple[RoleAssignment, ...], db: AsyncSession) -> dict[str, frozenset[str]]:
    role_permissions = {
        role_name: permissions
        for role_name, permissions in DEFAULT_ROLE_PERMISSIONS.items()
        if any(assignment.name == role_name for assignment in assignments)
    }
    role_names = {assignment.name for assignment in assignments}
    if not role_names:
        return role_permissions

    rows = await db.execute(
        select(Role.name, Permission.name)
        .join(RolePermission, RolePermission.role_id == Role.id)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .where(Role.name.in_(role_names))
    )
    for role_name, permission_name in rows.all():
        permissions = set(role_permissions.get(role_name, frozenset()))
        permissions.add(permission_name)
        role_permissions[role_name] = frozenset(permissions)
    return role_permissions


def _extract_explicit_school_id(request: Request) -> UUID | None:
    for candidate in (
        request.path_params.get("school_id"),
        request.query_params.get("school_id"),
        request.headers.get("X-School-ID"),
    ):
        school_id = _normalize_uuid(candidate)
        if school_id is not None:
            return school_id
    return None


def _infer_school_id(assignments: tuple[RoleAssignment, ...], request: Request) -> UUID | None:
    explicit_school_id = _extract_explicit_school_id(request)
    if explicit_school_id is not None:
        return explicit_school_id

    scoped_school_ids = {assignment.school_id for assignment in assignments if assignment.school_id is not None}
    if len(scoped_school_ids) == 1:
        return next(iter(scoped_school_ids))

    return None


async def get_rbac_context(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RBACContext:
    """Resolve effective RBAC context for the current request."""
    assignments = _dedupe_assignments(
        [
            *await _load_persisted_assignments(current_user, db),
            *await _load_legacy_assignments(current_user, db),
        ]
    )
    school_id = _infer_school_id(assignments, request)
    role_permissions = await _load_role_permissions(assignments, db)
    return RBACContext(
        user=current_user,
        school_id=school_id,
        assignments=assignments,
        role_permissions=role_permissions,
    )


def require_role(role_name: str):
    """Require a specific role for the current request."""

    async def dependency(
        request: Request,
        context: RBACContext = Depends(get_rbac_context),
    ) -> RBACContext:
        if not context.has_role(role_name):
            log_warning(
                "rbac",
                "rbac_access_denied",
                get_request_id(request),
                user_id=context.user.id,
                metadata={
                    "role_required": role_name,
                    "user_roles": sorted(context.roles),
                },
            )
            raise AccessDeniedError(request)
        return context

    dependency.__name__ = f"require_role_{role_name.lower()}"
    return dependency


def require_permission(permission_name: str):
    """Require a specific permission for the current request."""

    async def dependency(
        request: Request,
        context: RBACContext = Depends(get_rbac_context),
    ) -> RBACContext:
        if not context.has_permission(permission_name):
            log_warning(
                "rbac",
                "rbac_access_denied",
                get_request_id(request),
                user_id=context.user.id,
                metadata={
                    "role_required": None,
                    "permission_required": permission_name,
                    "user_roles": sorted(context.roles),
                },
            )
            raise AccessDeniedError(request)
        return context

    dependency.__name__ = f"require_permission_{permission_name.replace('.', '_')}"
    return dependency
