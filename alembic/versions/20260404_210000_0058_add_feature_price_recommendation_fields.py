"""add feature price recommendation fields

Revision ID: 0058
Revises: 0057
Create Date: 2026-04-04 21:00:00.000000+00:00

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0058"
down_revision: Union[str, None] = "0057"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_table("features"):
        return

    if not _has_column("features", "current_price"):
        op.add_column("features", sa.Column("current_price", sa.Numeric(10, 2), nullable=True))
    if not _has_column("features", "suggested_price_min"):
        op.add_column("features", sa.Column("suggested_price_min", sa.Numeric(10, 2), nullable=True))
    if not _has_column("features", "suggested_price_max"):
        op.add_column("features", sa.Column("suggested_price_max", sa.Numeric(10, 2), nullable=True))
    if not _has_column("features", "last_price_analysis_at"):
        op.add_column("features", sa.Column("last_price_analysis_at", sa.DateTime(timezone=True), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE features
            SET current_price = COALESCE(current_price, 10.00)
            """
        )
    )


def downgrade() -> None:
    if not _has_table("features"):
        return

    if _has_column("features", "last_price_analysis_at"):
        op.drop_column("features", "last_price_analysis_at")
    if _has_column("features", "suggested_price_max"):
        op.drop_column("features", "suggested_price_max")
    if _has_column("features", "suggested_price_min"):
        op.drop_column("features", "suggested_price_min")
    if _has_column("features", "current_price"):
        op.drop_column("features", "current_price")
