"""extend promo codes for linking

Revision ID: 0044
Revises: 0043
Create Date: 2026-03-10 17:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0044"
down_revision: Union[str, None] = "0043"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column.get("name") == column_name for column in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def _has_foreign_key(table_name: str, fk_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(fk.get("name") == fk_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    if not _has_column("promo_codes", "school_id"):
        op.add_column(
            "promo_codes",
            sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
    if not _has_column("promo_codes", "group_id"):
        op.add_column(
            "promo_codes",
            sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
    if not _has_column("promo_codes", "max_uses"):
        op.add_column(
            "promo_codes",
            sa.Column("max_uses", sa.Integer(), nullable=True),
        )
    if not _has_column("promo_codes", "current_uses"):
        op.add_column(
            "promo_codes",
            sa.Column("current_uses", sa.Integer(), nullable=False, server_default="0"),
        )

    if not _has_foreign_key("promo_codes", "fk_promo_codes_school_id_driving_schools"):
        op.create_foreign_key(
            "fk_promo_codes_school_id_driving_schools",
            "promo_codes",
            "driving_schools",
            ["school_id"],
            ["id"],
            ondelete="SET NULL",
        )

    if not _has_index("promo_codes", "ix_promo_codes_school_id"):
        op.create_index("ix_promo_codes_school_id", "promo_codes", ["school_id"], unique=False)
    if not _has_index("promo_redemptions", "ix_promo_redemptions_code_user"):
        op.create_index(
            "ix_promo_redemptions_code_user",
            "promo_redemptions",
            ["promo_code_id", "user_id"],
            unique=False,
        )

    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE promo_codes
            SET current_uses = COALESCE(redeemed_count, 0)
            WHERE current_uses IS NULL OR current_uses = 0
            """
        )
    )
    bind.execute(
        sa.text(
            """
            UPDATE promo_codes
            SET max_uses = max_redemptions
            WHERE max_uses IS NULL AND max_redemptions IS NOT NULL
            """
        )
    )

    op.alter_column("promo_codes", "current_uses", server_default=None)


def downgrade() -> None:
    if _has_index("promo_redemptions", "ix_promo_redemptions_code_user"):
        op.drop_index("ix_promo_redemptions_code_user", table_name="promo_redemptions")
    if _has_index("promo_codes", "ix_promo_codes_school_id"):
        op.drop_index("ix_promo_codes_school_id", table_name="promo_codes")
    if _has_foreign_key("promo_codes", "fk_promo_codes_school_id_driving_schools"):
        op.drop_constraint("fk_promo_codes_school_id_driving_schools", "promo_codes", type_="foreignkey")
    if _has_column("promo_codes", "current_uses"):
        op.drop_column("promo_codes", "current_uses")
    if _has_column("promo_codes", "max_uses"):
        op.drop_column("promo_codes", "max_uses")
    if _has_column("promo_codes", "group_id"):
        op.drop_column("promo_codes", "group_id")
    if _has_column("promo_codes", "school_id"):
        op.drop_column("promo_codes", "school_id")
