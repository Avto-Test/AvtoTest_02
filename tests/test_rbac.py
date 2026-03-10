"""
AUTOTEST RBAC Tests
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import create_access_token
from core.rbac import (
    INSTRUCTOR_ROLE,
    SCHOOL_ADMIN_ROLE,
    SCHOOL_VIEW_DASHBOARD,
    SCHOOL_VIEW_GROUPS,
    SUPER_ADMIN_ROLE,
    ADMIN_SCHOOLS_CREATE,
    ADMIN_USERS_READ,
)
from core.security import get_password_hash
from models.driving_school import DrivingSchool
from models.permission import Permission
from models.role import Role
from models.role_permission import RolePermission
from models.school_membership import SchoolMembership
from models.user import User
from models.user_role import UserRole


ROLE_DESCRIPTIONS = {
    SUPER_ADMIN_ROLE: "Platform-wide super administrator",
    SCHOOL_ADMIN_ROLE: "School-scoped administrator",
    INSTRUCTOR_ROLE: "School-scoped instructor",
    "Student": "Standard student role",
}

PERMISSION_DESCRIPTIONS = {
    ADMIN_SCHOOLS_CREATE: "Create and manage schools from admin scope",
    ADMIN_USERS_READ: "Read platform users from admin scope",
    SCHOOL_VIEW_DASHBOARD: "View school dashboard data",
    SCHOOL_VIEW_GROUPS: "View school groups and group members",
}

ROLE_PERMISSION_MAP = {
    SUPER_ADMIN_ROLE: {
        ADMIN_SCHOOLS_CREATE,
        ADMIN_USERS_READ,
        SCHOOL_VIEW_DASHBOARD,
        SCHOOL_VIEW_GROUPS,
    },
    SCHOOL_ADMIN_ROLE: {
        SCHOOL_VIEW_DASHBOARD,
        SCHOOL_VIEW_GROUPS,
    },
    INSTRUCTOR_ROLE: {
        SCHOOL_VIEW_DASHBOARD,
        SCHOOL_VIEW_GROUPS,
    },
}


async def _create_user(db_session: AsyncSession, email: str) -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _seed_rbac_defaults(db_session: AsyncSession) -> dict[str, Role]:
    roles: dict[str, Role] = {}
    permissions: dict[str, Permission] = {}

    for role_name, description in ROLE_DESCRIPTIONS.items():
        result = await db_session.execute(select(Role).where(Role.name == role_name))
        role = result.scalar_one_or_none()
        if role is None:
            role = Role(name=role_name, description=description)
            db_session.add(role)
            await db_session.flush()
        roles[role_name] = role

    for permission_name, description in PERMISSION_DESCRIPTIONS.items():
        result = await db_session.execute(select(Permission).where(Permission.name == permission_name))
        permission = result.scalar_one_or_none()
        if permission is None:
            permission = Permission(name=permission_name, description=description)
            db_session.add(permission)
            await db_session.flush()
        permissions[permission_name] = permission

    for role_name, permission_names in ROLE_PERMISSION_MAP.items():
        role = roles[role_name]
        for permission_name in permission_names:
            permission = permissions[permission_name]
            result = await db_session.execute(
                select(RolePermission).where(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == permission.id,
                )
            )
            if result.scalar_one_or_none() is None:
                db_session.add(RolePermission(role_id=role.id, permission_id=permission.id))

    await db_session.commit()
    return roles


@pytest.mark.asyncio
async def test_admin_rbac_denial_uses_standardized_payload(
    client: AsyncClient,
    normal_user_token: str,
):
    response = await client.get(
        "/admin/users",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 403
    payload = response.json()
    assert payload["error_code"] == "ACCESS_DENIED"
    assert payload["message"] == "You do not have permission to access this resource"
    assert isinstance(payload["request_id"], str)
    assert payload["request_id"]


@pytest.mark.asyncio
async def test_school_dashboard_and_group_access_allow_instructor_and_school_admin(
    client: AsyncClient,
    db_session: AsyncSession,
):
    roles = await _seed_rbac_defaults(db_session)

    school_admin = await _create_user(db_session, "school-admin@example.com")
    instructor = await _create_user(db_session, "instructor@example.com")
    student = await _create_user(db_session, "school-student@example.com")

    school = DrivingSchool(
        slug="rbac-school",
        name="RBAC Driving School",
        city="Tashkent",
        phone="+998900001122",
        referral_code="RBACSCHOOL",
        is_active=True,
    )
    db_session.add(school)
    await db_session.flush()

    group_id = uuid.uuid4()
    db_session.add_all(
        [
            UserRole(user_id=school_admin.id, role_id=roles[SCHOOL_ADMIN_ROLE].id, school_id=school.id),
            UserRole(user_id=instructor.id, role_id=roles[INSTRUCTOR_ROLE].id, school_id=school.id),
            SchoolMembership(
                user_id=school_admin.id,
                school_id=school.id,
                group_id=group_id,
                role_id=roles[SCHOOL_ADMIN_ROLE].id,
            ),
            SchoolMembership(
                user_id=instructor.id,
                school_id=school.id,
                group_id=group_id,
                role_id=roles[INSTRUCTOR_ROLE].id,
            ),
            SchoolMembership(
                user_id=student.id,
                school_id=school.id,
                group_id=group_id,
                role_id=roles["Student"].id,
            ),
        ]
    )
    await db_session.commit()

    instructor_token = create_access_token(instructor.id)
    dashboard_response = await client.get(
        f"/school/dashboard?school_id={school.id}",
        headers={"Authorization": f"Bearer {instructor_token}"},
    )
    assert dashboard_response.status_code == 200
    dashboard_payload = dashboard_response.json()
    assert dashboard_payload["school_id"] == str(school.id)
    assert dashboard_payload["active_role"] == INSTRUCTOR_ROLE
    assert dashboard_payload["member_count"] == 3
    assert dashboard_payload["group_count"] == 1

    school_admin_token = create_access_token(school_admin.id)
    group_response = await client.get(
        f"/school/groups/{group_id}?school_id={school.id}",
        headers={"Authorization": f"Bearer {school_admin_token}"},
    )
    assert group_response.status_code == 200
    group_payload = group_response.json()
    assert group_payload["member_count"] == 3
    assert {member["role"] for member in group_payload["members"]} == {
        SCHOOL_ADMIN_ROLE,
        INSTRUCTOR_ROLE,
        "Student",
    }


@pytest.mark.asyncio
async def test_school_group_access_denies_plain_student_with_standardized_payload(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
):
    roles = await _seed_rbac_defaults(db_session)

    school = DrivingSchool(
        slug="rbac-school-deny",
        name="RBAC Deny School",
        city="Samarkand",
        phone="+998900003344",
        referral_code="RBACDENY",
        is_active=True,
    )
    db_session.add(school)
    await db_session.flush()

    group_id = uuid.uuid4()
    db_session.add(
        SchoolMembership(
            user_id=normal_user.id,
            school_id=school.id,
            group_id=group_id,
            role_id=roles["Student"].id,
        )
    )
    await db_session.commit()

    response = await client.get(
        f"/school/groups/{group_id}?school_id={school.id}",
        headers={"Authorization": f"Bearer {create_access_token(normal_user.id)}"},
    )
    assert response.status_code == 403
    payload = response.json()
    assert payload["error_code"] == "ACCESS_DENIED"
    assert payload["message"] == "You do not have permission to access this resource"
    assert isinstance(payload["request_id"], str)
    assert payload["request_id"]
