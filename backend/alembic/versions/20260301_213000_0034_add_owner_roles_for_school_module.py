"""add owner links for driving school module

Revision ID: c18b2f7a9d01
Revises: d5b8f0c1a7e4
Create Date: 2026-03-01 21:30:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c18b2f7a9d01"
down_revision: Union[str, None] = "d5b8f0c1a7e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = inspector.get_columns(table_name)
    return any(column.get("name") == column_name for column in columns)


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_column("driving_schools", "owner_user_id"):
        op.add_column(
            "driving_schools",
            sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            "fk_driving_schools_owner_user_id_users",
            "driving_schools",
            "users",
            ["owner_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_unique_constraint(
            "uq_driving_schools_owner_user_id",
            "driving_schools",
            ["owner_user_id"],
        )

    if not _has_index("driving_schools", "ix_driving_schools_owner_user_id"):
        op.create_index("ix_driving_schools_owner_user_id", "driving_schools", ["owner_user_id"], unique=False)

    if not _has_column("driving_school_partner_applications", "user_id"):
        op.add_column(
            "driving_school_partner_applications",
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            "fk_driving_school_partner_applications_user_id_users",
            "driving_school_partner_applications",
            "users",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )

    if not _has_index("driving_school_partner_applications", "ix_driving_school_partner_applications_user_id"):
        op.create_index(
            "ix_driving_school_partner_applications_user_id",
            "driving_school_partner_applications",
            ["user_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes_by_table = {
        table: {idx.get("name") for idx in inspector.get_indexes(table)}
        for table in inspector.get_table_names()
    }

    if "driving_school_partner_applications" in indexes_by_table and "ix_driving_school_partner_applications_user_id" in indexes_by_table["driving_school_partner_applications"]:
        op.drop_index("ix_driving_school_partner_applications_user_id", table_name="driving_school_partner_applications")
    if _has_column("driving_school_partner_applications", "user_id"):
        op.drop_constraint(
            "fk_driving_school_partner_applications_user_id_users",
            "driving_school_partner_applications",
            type_="foreignkey",
        )
        op.drop_column("driving_school_partner_applications", "user_id")

    if "driving_schools" in indexes_by_table and "ix_driving_schools_owner_user_id" in indexes_by_table["driving_schools"]:
        op.drop_index("ix_driving_schools_owner_user_id", table_name="driving_schools")
    if _has_column("driving_schools", "owner_user_id"):
        op.drop_constraint("uq_driving_schools_owner_user_id", "driving_schools", type_="unique")
        op.drop_constraint("fk_driving_schools_owner_user_id_users", "driving_schools", type_="foreignkey")
        op.drop_column("driving_schools", "owner_user_id")
