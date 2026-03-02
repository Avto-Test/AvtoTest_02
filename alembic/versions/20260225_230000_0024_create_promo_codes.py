"""Create promo code tables

Revision ID: 0024
Revises: 0023
Create Date: 2026-02-25 23:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0024"
down_revision: Union[str, None] = "0023"
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
    if not _has_table("promo_codes"):
        op.create_table(
            "promo_codes",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("code", sa.String(length=50), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=True),
            sa.Column("description", sa.String(length=500), nullable=True),
            sa.Column("discount_type", sa.String(length=20), nullable=False, server_default="percent"),
            sa.Column("discount_value", sa.Integer(), nullable=False),
            sa.Column("max_redemptions", sa.Integer(), nullable=True),
            sa.Column("redeemed_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code", name="uq_promo_codes_code"),
        )
        op.create_index("ix_promo_codes_code", "promo_codes", ["code"], unique=True)
        op.create_index("ix_promo_codes_active", "promo_codes", ["is_active"], unique=False)
        op.create_index("ix_promo_codes_expires_at", "promo_codes", ["expires_at"], unique=False)

    if not _has_table("promo_redemptions"):
        op.create_table(
            "promo_redemptions",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("promo_code_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["promo_code_id"], ["promo_codes.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_promo_redemptions_code", "promo_redemptions", ["promo_code_id"], unique=False)
        op.create_index("ix_promo_redemptions_user", "promo_redemptions", ["user_id"], unique=False)
        op.create_index("ix_promo_redemptions_payment", "promo_redemptions", ["payment_id"], unique=False)


def downgrade() -> None:
    if _has_table("promo_redemptions"):
        for index_name in (
            "ix_promo_redemptions_payment",
            "ix_promo_redemptions_user",
            "ix_promo_redemptions_code",
        ):
            if _has_index("promo_redemptions", index_name):
                op.drop_index(index_name, table_name="promo_redemptions")
        op.drop_table("promo_redemptions")

    if _has_table("promo_codes"):
        for index_name in (
            "ix_promo_codes_expires_at",
            "ix_promo_codes_active",
            "ix_promo_codes_code",
        ):
            if _has_index("promo_codes", index_name):
                op.drop_index(index_name, table_name="promo_codes")
        op.drop_table("promo_codes")
