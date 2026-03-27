"""add linked ids to marketplace applications

Revision ID: 0052
Revises: 0051
Create Date: 2026-03-25 02:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0052"
down_revision: Union[str, None] = "0051"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column.get("name") == column_name for column in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def _has_foreign_key(table_name: str, foreign_key_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(foreign_key.get("name") == foreign_key_name for foreign_key in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    if _has_table("driving_school_partner_applications"):
        if not _has_column("driving_school_partner_applications", "linked_school_id"):
            op.add_column(
                "driving_school_partner_applications",
                sa.Column("linked_school_id", postgresql.UUID(as_uuid=True), nullable=True),
            )
        if not _has_foreign_key(
            "driving_school_partner_applications",
            "fk_driving_school_partner_applications_linked_school_id",
        ):
            op.create_foreign_key(
                "fk_driving_school_partner_applications_linked_school_id",
                "driving_school_partner_applications",
                "driving_schools",
                ["linked_school_id"],
                ["id"],
                ondelete="SET NULL",
            )
        if not _has_index("driving_school_partner_applications", "ix_driving_school_partner_applications_linked_school_id"):
            op.create_index(
                "ix_driving_school_partner_applications_linked_school_id",
                "driving_school_partner_applications",
                ["linked_school_id"],
                unique=False,
            )

        op.execute(
            sa.text(
                """
                UPDATE driving_school_partner_applications AS application
                SET linked_school_id = school.id
                FROM driving_schools AS school
                WHERE application.linked_school_id IS NULL
                  AND application.user_id IS NOT NULL
                  AND school.owner_user_id = application.user_id
                """
            )
        )
        op.execute(
            sa.text(
                """
                WITH unique_name_matches AS (
                    SELECT
                        application.id AS application_id,
                        MIN(school.id::text)::uuid AS school_id,
                        COUNT(*) AS candidate_count
                    FROM driving_school_partner_applications AS application
                    JOIN driving_schools AS school
                      ON lower(trim(regexp_replace(application.school_name, '\\s+', ' ', 'g')))
                       = lower(trim(regexp_replace(school.name, '\\s+', ' ', 'g')))
                    WHERE application.linked_school_id IS NULL
                    GROUP BY application.id
                    HAVING COUNT(*) = 1
                )
                UPDATE driving_school_partner_applications AS application
                SET linked_school_id = matched.school_id
                FROM unique_name_matches AS matched
                WHERE application.id = matched.application_id
                  AND application.linked_school_id IS NULL
                """
            )
        )

    if _has_table("driving_instructor_applications"):
        if not _has_column("driving_instructor_applications", "linked_instructor_id"):
            op.add_column(
                "driving_instructor_applications",
                sa.Column("linked_instructor_id", postgresql.UUID(as_uuid=True), nullable=True),
            )
        if not _has_foreign_key(
            "driving_instructor_applications",
            "fk_driving_instructor_applications_linked_instructor_id",
        ):
            op.create_foreign_key(
                "fk_driving_instructor_applications_linked_instructor_id",
                "driving_instructor_applications",
                "driving_instructors",
                ["linked_instructor_id"],
                ["id"],
                ondelete="SET NULL",
            )
        if not _has_index(
            "driving_instructor_applications",
            "ix_driving_instructor_applications_linked_instructor_id",
        ):
            op.create_index(
                "ix_driving_instructor_applications_linked_instructor_id",
                "driving_instructor_applications",
                ["linked_instructor_id"],
                unique=False,
            )

        op.execute(
            sa.text(
                """
                UPDATE driving_instructor_applications AS application
                SET linked_instructor_id = instructor.id
                FROM driving_instructors AS instructor
                WHERE application.linked_instructor_id IS NULL
                  AND application.user_id IS NOT NULL
                  AND instructor.user_id = application.user_id
                """
            )
        )
        op.execute(
            sa.text(
                """
                WITH unique_name_matches AS (
                    SELECT
                        application.id AS application_id,
                        MIN(instructor.id::text)::uuid AS instructor_id,
                        COUNT(*) AS candidate_count
                    FROM driving_instructor_applications AS application
                    JOIN driving_instructors AS instructor
                      ON lower(trim(regexp_replace(application.full_name, '\\s+', ' ', 'g')))
                       = lower(trim(regexp_replace(instructor.full_name, '\\s+', ' ', 'g')))
                    WHERE application.linked_instructor_id IS NULL
                    GROUP BY application.id
                    HAVING COUNT(*) = 1
                )
                UPDATE driving_instructor_applications AS application
                SET linked_instructor_id = matched.instructor_id
                FROM unique_name_matches AS matched
                WHERE application.id = matched.application_id
                  AND application.linked_instructor_id IS NULL
                """
            )
        )


def downgrade() -> None:
    if _has_table("driving_instructor_applications"):
        if _has_index("driving_instructor_applications", "ix_driving_instructor_applications_linked_instructor_id"):
            op.drop_index(
                "ix_driving_instructor_applications_linked_instructor_id",
                table_name="driving_instructor_applications",
            )
        if _has_foreign_key(
            "driving_instructor_applications",
            "fk_driving_instructor_applications_linked_instructor_id",
        ):
            op.drop_constraint(
                "fk_driving_instructor_applications_linked_instructor_id",
                "driving_instructor_applications",
                type_="foreignkey",
            )
        if _has_column("driving_instructor_applications", "linked_instructor_id"):
            op.drop_column("driving_instructor_applications", "linked_instructor_id")

    if _has_table("driving_school_partner_applications"):
        if _has_index("driving_school_partner_applications", "ix_driving_school_partner_applications_linked_school_id"):
            op.drop_index(
                "ix_driving_school_partner_applications_linked_school_id",
                table_name="driving_school_partner_applications",
            )
        if _has_foreign_key(
            "driving_school_partner_applications",
            "fk_driving_school_partner_applications_linked_school_id",
        ):
            op.drop_constraint(
                "fk_driving_school_partner_applications_linked_school_id",
                "driving_school_partner_applications",
                type_="foreignkey",
            )
        if _has_column("driving_school_partner_applications", "linked_school_id"):
            op.drop_column("driving_school_partner_applications", "linked_school_id")
