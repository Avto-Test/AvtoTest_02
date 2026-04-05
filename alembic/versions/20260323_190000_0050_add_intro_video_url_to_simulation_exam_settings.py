"""add intro video url to simulation exam settings

Revision ID: 0050
Revises: 0049
Create Date: 2026-03-23 19:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0050"
down_revision: Union[str, None] = "0049"
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

    if not _has_column("simulation_exam_settings", "intro_video_url"):
        op.add_column(
            "simulation_exam_settings",
            sa.Column("intro_video_url", sa.String(length=2000), nullable=True),
        )


def downgrade() -> None:
    if not _has_table("simulation_exam_settings"):
        return

    if _has_column("simulation_exam_settings", "intro_video_url"):
        op.drop_column("simulation_exam_settings", "intro_video_url")
