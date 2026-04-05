"""create exam simulation attempts

Revision ID: 0045
Revises: 0044
Create Date: 2026-03-13 17:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0045"
down_revision: Union[str, None] = "0044"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_table("exam_simulation_attempts"):
        op.create_table(
            "exam_simulation_attempts",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("attempts.id", ondelete="CASCADE"),
                primary_key=True,
                nullable=False,
            ),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cooldown_started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("next_available_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("readiness_snapshot", sa.Float(), nullable=False, server_default="0"),
            sa.Column("pass_probability_snapshot", sa.Float(), nullable=False, server_default="0"),
            sa.Column("question_count", sa.Integer(), nullable=False, server_default="40"),
            sa.Column("pressure_mode", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("mistake_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("timeout", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("passed", sa.Boolean(), nullable=False, server_default="false"),
        )

    if not _has_index("exam_simulation_attempts", "ix_exam_simulation_attempts_user_id"):
        op.create_index("ix_exam_simulation_attempts_user_id", "exam_simulation_attempts", ["user_id"], unique=False)
    if not _has_index("exam_simulation_attempts", "ix_exam_simulation_attempts_user_started_at"):
        op.create_index(
            "ix_exam_simulation_attempts_user_started_at",
            "exam_simulation_attempts",
            ["user_id", "started_at"],
            unique=False,
        )
    if not _has_index("exam_simulation_attempts", "ix_exam_simulation_attempts_user_next_available_at"):
        op.create_index(
            "ix_exam_simulation_attempts_user_next_available_at",
            "exam_simulation_attempts",
            ["user_id", "next_available_at"],
            unique=False,
        )


def downgrade() -> None:
    if _has_index("exam_simulation_attempts", "ix_exam_simulation_attempts_user_next_available_at"):
        op.drop_index("ix_exam_simulation_attempts_user_next_available_at", table_name="exam_simulation_attempts")
    if _has_index("exam_simulation_attempts", "ix_exam_simulation_attempts_user_started_at"):
        op.drop_index("ix_exam_simulation_attempts_user_started_at", table_name="exam_simulation_attempts")
    if _has_index("exam_simulation_attempts", "ix_exam_simulation_attempts_user_id"):
        op.drop_index("ix_exam_simulation_attempts_user_id", table_name="exam_simulation_attempts")
    if _has_table("exam_simulation_attempts"):
        op.drop_table("exam_simulation_attempts")
