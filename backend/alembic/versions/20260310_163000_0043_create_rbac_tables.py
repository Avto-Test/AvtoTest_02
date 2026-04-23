"""create rbac tables

Revision ID: 0043
Revises: 0042
Create Date: 2026-03-10 16:30:00.000000
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0043"
down_revision: Union[str, None] = "0042"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ROLE_DEFINITIONS = (
    ("SuperAdmin", "Platform-wide super administrator"),
    ("SchoolAdmin", "School-scoped administrator"),
    ("Instructor", "School-scoped instructor"),
    ("Student", "Standard student role"),
)

PERMISSION_DEFINITIONS = (
    ("admin.schools.create", "Create and manage schools from admin scope"),
    ("admin.users.read", "Read platform users from admin scope"),
    ("school.view_dashboard", "View school dashboard data"),
    ("school.view_groups", "View school groups and group members"),
    ("school.manage_members", "Manage school memberships"),
)

ROLE_PERMISSION_MAP = {
    "SuperAdmin": {
        "admin.schools.create",
        "admin.users.read",
        "school.view_dashboard",
        "school.view_groups",
        "school.manage_members",
    },
    "SchoolAdmin": {
        "school.view_dashboard",
        "school.view_groups",
        "school.manage_members",
    },
    "Instructor": {
        "school.view_dashboard",
        "school.view_groups",
    },
    "Student": set(),
}


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_table("roles"):
        op.create_table(
            "roles",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=80), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name", name="uq_roles_name"),
        )
    if not _has_index("roles", "ix_roles_name"):
        op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    if not _has_table("permissions"):
        op.create_table(
            "permissions",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name", name="uq_permissions_name"),
        )
    if not _has_index("permissions", "ix_permissions_name"):
        op.create_index("ix_permissions_name", "permissions", ["name"], unique=True)

    if not _has_table("role_permissions"):
        op.create_table(
            "role_permissions",
            sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("role_id", "permission_id"),
        )

    if not _has_table("user_roles"):
        op.create_table(
            "user_roles",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["school_id"], ["driving_schools.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("user_roles", "ix_user_roles_user_id"):
        op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"], unique=False)
    if not _has_index("user_roles", "ix_user_roles_school_id"):
        op.create_index("ix_user_roles_school_id", "user_roles", ["school_id"], unique=False)
    if not _has_index("user_roles", "ix_user_roles_role_id"):
        op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"], unique=False)

    if not _has_table("school_memberships"):
        op.create_table(
            "school_memberships",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["school_id"], ["driving_schools.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("school_memberships", "ix_school_memberships_user_id"):
        op.create_index("ix_school_memberships_user_id", "school_memberships", ["user_id"], unique=False)
    if not _has_index("school_memberships", "ix_school_memberships_school_id"):
        op.create_index("ix_school_memberships_school_id", "school_memberships", ["school_id"], unique=False)
    if not _has_index("school_memberships", "ix_school_memberships_role_id"):
        op.create_index("ix_school_memberships_role_id", "school_memberships", ["role_id"], unique=False)

    connection = op.get_bind()
    now = datetime.now(timezone.utc)

    roles_table = sa.table(
        "roles",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
    )
    permissions_table = sa.table(
        "permissions",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
    )
    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("role_id", postgresql.UUID(as_uuid=True)),
        sa.column("permission_id", postgresql.UUID(as_uuid=True)),
    )
    user_roles_table = sa.table(
        "user_roles",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("role_id", postgresql.UUID(as_uuid=True)),
        sa.column("school_id", postgresql.UUID(as_uuid=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    school_memberships_table = sa.table(
        "school_memberships",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("school_id", postgresql.UUID(as_uuid=True)),
        sa.column("group_id", postgresql.UUID(as_uuid=True)),
        sa.column("role_id", postgresql.UUID(as_uuid=True)),
        sa.column("joined_at", sa.DateTime(timezone=True)),
    )
    users_table = sa.table(
        "users",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("is_admin", sa.Boolean()),
    )
    schools_table = sa.table(
        "driving_schools",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("owner_user_id", postgresql.UUID(as_uuid=True)),
    )

    existing_roles = set(connection.execute(sa.select(roles_table.c.name)).scalars().all())
    missing_roles = [
        {"id": uuid.uuid4(), "name": name, "description": description}
        for name, description in ROLE_DEFINITIONS
        if name not in existing_roles
    ]
    if missing_roles:
        op.bulk_insert(roles_table, missing_roles)

    existing_permissions = set(connection.execute(sa.select(permissions_table.c.name)).scalars().all())
    missing_permissions = [
        {"id": uuid.uuid4(), "name": name, "description": description}
        for name, description in PERMISSION_DEFINITIONS
        if name not in existing_permissions
    ]
    if missing_permissions:
        op.bulk_insert(permissions_table, missing_permissions)

    role_id_map = dict(connection.execute(sa.select(roles_table.c.name, roles_table.c.id)).all())
    permission_id_map = dict(connection.execute(sa.select(permissions_table.c.name, permissions_table.c.id)).all())

    existing_role_permissions = set(connection.execute(sa.select(role_permissions_table.c.role_id, role_permissions_table.c.permission_id)).all())
    missing_role_permissions: list[dict[str, uuid.UUID]] = []
    for role_name, permission_names in ROLE_PERMISSION_MAP.items():
        role_id = role_id_map.get(role_name)
        if role_id is None:
            continue
        for permission_name in permission_names:
            permission_id = permission_id_map.get(permission_name)
            if permission_id is None:
                continue
            key = (role_id, permission_id)
            if key in existing_role_permissions:
                continue
            missing_role_permissions.append({"role_id": role_id, "permission_id": permission_id})
            existing_role_permissions.add(key)
    if missing_role_permissions:
        op.bulk_insert(role_permissions_table, missing_role_permissions)

    existing_user_roles = {
        (user_id, role_id, school_id)
        for user_id, role_id, school_id in connection.execute(
            sa.select(
                user_roles_table.c.user_id,
                user_roles_table.c.role_id,
                user_roles_table.c.school_id,
            )
        ).all()
    }

    student_role_id = role_id_map.get("Student")
    if student_role_id is not None:
        student_rows: list[dict[str, object]] = []
        for user_id in connection.execute(sa.select(users_table.c.id)).scalars().all():
            key = (user_id, student_role_id, None)
            if key in existing_user_roles:
                continue
            student_rows.append(
                {
                    "id": uuid.uuid4(),
                    "user_id": user_id,
                    "role_id": student_role_id,
                    "school_id": None,
                    "created_at": now,
                }
            )
            existing_user_roles.add(key)
        if student_rows:
            op.bulk_insert(user_roles_table, student_rows)

    super_admin_role_id = role_id_map.get("SuperAdmin")
    if super_admin_role_id is not None:
        super_admin_rows: list[dict[str, object]] = []
        admin_ids = connection.execute(
            sa.select(users_table.c.id).where(users_table.c.is_admin.is_(True))
        ).scalars().all()
        for user_id in admin_ids:
            key = (user_id, super_admin_role_id, None)
            if key in existing_user_roles:
                continue
            super_admin_rows.append(
                {
                    "id": uuid.uuid4(),
                    "user_id": user_id,
                    "role_id": super_admin_role_id,
                    "school_id": None,
                    "created_at": now,
                }
            )
            existing_user_roles.add(key)
        if super_admin_rows:
            op.bulk_insert(user_roles_table, super_admin_rows)

    school_admin_role_id = role_id_map.get("SchoolAdmin")
    if school_admin_role_id is not None:
        existing_memberships = {
            (user_id, school_id, role_id, group_id)
            for user_id, school_id, role_id, group_id in connection.execute(
                sa.select(
                    school_memberships_table.c.user_id,
                    school_memberships_table.c.school_id,
                    school_memberships_table.c.role_id,
                    school_memberships_table.c.group_id,
                )
            ).all()
        }
        owner_rows: list[dict[str, object]] = []
        membership_rows: list[dict[str, object]] = []
        owned_schools = connection.execute(
            sa.select(schools_table.c.id, schools_table.c.owner_user_id).where(
                schools_table.c.owner_user_id.is_not(None)
            )
        ).all()
        for school_id, owner_user_id in owned_schools:
            role_key = (owner_user_id, school_admin_role_id, school_id)
            if role_key not in existing_user_roles:
                owner_rows.append(
                    {
                        "id": uuid.uuid4(),
                        "user_id": owner_user_id,
                        "role_id": school_admin_role_id,
                        "school_id": school_id,
                        "created_at": now,
                    }
                )
                existing_user_roles.add(role_key)

            membership_key = (owner_user_id, school_id, school_admin_role_id, None)
            if membership_key in existing_memberships:
                continue
            membership_rows.append(
                {
                    "id": uuid.uuid4(),
                    "user_id": owner_user_id,
                    "school_id": school_id,
                    "group_id": None,
                    "role_id": school_admin_role_id,
                    "joined_at": now,
                }
            )
            existing_memberships.add(membership_key)

        if owner_rows:
            op.bulk_insert(user_roles_table, owner_rows)
        if membership_rows:
            op.bulk_insert(school_memberships_table, membership_rows)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "school_memberships" in tables:
        op.drop_table("school_memberships")
    if "user_roles" in tables:
        op.drop_table("user_roles")
    if "role_permissions" in tables:
        op.drop_table("role_permissions")
    if "permissions" in tables:
        op.drop_table("permissions")
    if "roles" in tables:
        op.drop_table("roles")
