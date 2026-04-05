"""add phase 5 economy tables

Revision ID: 0047
Revises: 0046
Create Date: 2026-03-13 20:35:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0047"
down_revision: Union[str, None] = "0046"
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


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column.get("name") == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    if _has_table("exam_simulation_attempts") and not _has_column("exam_simulation_attempts", "cooldown_reduction_days_used"):
        op.add_column(
            "exam_simulation_attempts",
            sa.Column("cooldown_reduction_days_used", sa.Integer(), nullable=False, server_default="0"),
        )

    if not _has_table("xp_boosts"):
        op.create_table(
            "xp_boosts",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("multiplier", sa.Float(), nullable=False, server_default="1.2"),
            sa.Column("source", sa.String(length=64), nullable=False, server_default="coin_boost"),
            sa.Column("activated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )

    if not _has_index("xp_boosts", "ix_xp_boosts_user_expires"):
        op.create_index("ix_xp_boosts_user_expires", "xp_boosts", ["user_id", "expires_at"], unique=False)


def downgrade() -> None:
    if _has_table("xp_boosts") and _has_index("xp_boosts", "ix_xp_boosts_user_expires"):
        op.drop_index("ix_xp_boosts_user_expires", table_name="xp_boosts")
    if _has_table("xp_boosts"):
        op.drop_table("xp_boosts")

    if _has_table("exam_simulation_attempts") and _has_column("exam_simulation_attempts", "cooldown_reduction_days_used"):
        op.drop_column("exam_simulation_attempts", "cooldown_reduction_days_used")
