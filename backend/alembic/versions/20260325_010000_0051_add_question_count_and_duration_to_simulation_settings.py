"""add simulation question count and duration settings

Revision ID: 0051
Revises: 0050
Create Date: 2026-03-25 01:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0051"
down_revision: Union[str, None] = "0050"
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


def upgrade() -> None:
    if not _has_table("simulation_exam_settings"):
        return

    if not _has_column("simulation_exam_settings", "question_count"):
        op.add_column(
            "simulation_exam_settings",
            sa.Column("question_count", sa.Integer(), nullable=False, server_default="40"),
        )
    if not _has_column("simulation_exam_settings", "duration_minutes"):
        op.add_column(
            "simulation_exam_settings",
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="40"),
        )

    op.execute(
        sa.text(
            """
            UPDATE simulation_exam_settings
            SET question_count = COALESCE(question_count, 40),
                duration_minutes = COALESCE(duration_minutes, 40)
            """
        )
    )


def downgrade() -> None:
    if not _has_table("simulation_exam_settings"):
        return

    if _has_column("simulation_exam_settings", "duration_minutes"):
        op.drop_column("simulation_exam_settings", "duration_minutes")
    if _has_column("simulation_exam_settings", "question_count"):
        op.drop_column("simulation_exam_settings", "question_count")
