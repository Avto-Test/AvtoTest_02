"""add attempt session fields for adaptive question sets

Revision ID: 7b62d3a4d0e8
Revises: c9f7b0d9f1a2
Create Date: 2026-02-27 12:00:00

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "7b62d3a4d0e8"
down_revision: Union[str, None] = "c9f7b0d9f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column.get("name") == column_name for column in inspector.get_columns(table_name))


def _has_check_constraint(table_name: str, constraint_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(constraint.get("name") == constraint_name for constraint in inspector.get_check_constraints(table_name))


def upgrade() -> None:
    if not _has_column("attempts", "question_ids"):
        op.add_column(
            "attempts",
            sa.Column(
                "question_ids",
                postgresql.JSON(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::json"),
            ),
        )

    if not _has_column("attempts", "question_count"):
        op.add_column(
            "attempts",
            sa.Column("question_count", sa.Integer(), nullable=False, server_default="20"),
        )

    if not _has_column("attempts", "time_limit_seconds"):
        op.add_column(
            "attempts",
            sa.Column("time_limit_seconds", sa.Integer(), nullable=False, server_default="1500"),
        )

    if not _has_check_constraint("attempts", "check_attempt_question_count_positive"):
        op.create_check_constraint(
            "check_attempt_question_count_positive",
            "attempts",
            "question_count >= 1",
        )

    if not _has_check_constraint("attempts", "check_attempt_time_limit_seconds_min"):
        op.create_check_constraint(
            "check_attempt_time_limit_seconds_min",
            "attempts",
            "time_limit_seconds >= 30",
        )


def downgrade() -> None:
    if _has_check_constraint("attempts", "check_attempt_time_limit_seconds_min"):
        op.drop_constraint("check_attempt_time_limit_seconds_min", "attempts", type_="check")
    if _has_check_constraint("attempts", "check_attempt_question_count_positive"):
        op.drop_constraint("check_attempt_question_count_positive", "attempts", type_="check")

    if _has_column("attempts", "time_limit_seconds"):
        op.drop_column("attempts", "time_limit_seconds")
    if _has_column("attempts", "question_count"):
        op.drop_column("attempts", "question_count")
    if _has_column("attempts", "question_ids"):
        op.drop_column("attempts", "question_ids")
