"""extend simulation exam settings

Revision ID: 0049
Revises: 0048
Create Date: 2026-03-20 11:15:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0049"
down_revision: Union[str, None] = "0048"
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

    if not _has_column("simulation_exam_settings", "cooldown_days"):
        op.add_column(
            "simulation_exam_settings",
            sa.Column("cooldown_days", sa.Integer(), nullable=False, server_default="14"),
        )
    if not _has_column("simulation_exam_settings", "fast_unlock_price"):
        op.add_column(
            "simulation_exam_settings",
            sa.Column("fast_unlock_price", sa.Integer(), nullable=False, server_default="120"),
        )

    op.execute(
        sa.text(
            """
            UPDATE simulation_exam_settings
            SET cooldown_days = COALESCE(cooldown_days, 14),
                fast_unlock_price = COALESCE(fast_unlock_price, 120)
            """
        )
    )


def downgrade() -> None:
    if not _has_table("simulation_exam_settings"):
        return

    if _has_column("simulation_exam_settings", "fast_unlock_price"):
        op.drop_column("simulation_exam_settings", "fast_unlock_price")
    if _has_column("simulation_exam_settings", "cooldown_days"):
        op.drop_column("simulation_exam_settings", "cooldown_days")
