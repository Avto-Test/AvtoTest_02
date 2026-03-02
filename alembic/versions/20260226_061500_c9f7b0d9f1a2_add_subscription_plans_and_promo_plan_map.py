"""add subscription plans and promo-plan mapping

Revision ID: c9f7b0d9f1a2
Revises: 1794ea880ddf
Create Date: 2026-02-26 06:15:00

"""

from __future__ import annotations

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c9f7b0d9f1a2"
down_revision: Union[str, None] = "1794ea880ddf"
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
    if not _has_table("subscription_plans"):
        op.create_table(
            "subscription_plans",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("code", sa.String(length=50), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.String(length=500), nullable=True),
            sa.Column("price_cents", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
            sa.Column("duration_days", sa.Integer(), nullable=False, server_default="30"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code", name="uq_subscription_plans_code"),
        )
        op.create_index("ix_subscription_plans_code", "subscription_plans", ["code"], unique=True)
        op.create_index("ix_subscription_plans_active", "subscription_plans", ["is_active"], unique=False)
        op.create_index("ix_subscription_plans_sort_order", "subscription_plans", ["sort_order"], unique=False)

    if not _has_table("promo_code_plans"):
        op.create_table(
            "promo_code_plans",
            sa.Column("promo_code_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["promo_code_id"], ["promo_codes.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("promo_code_id", "plan_id"),
        )
        op.create_index("ix_promo_code_plans_promo", "promo_code_plans", ["promo_code_id"], unique=False)
        op.create_index("ix_promo_code_plans_plan", "promo_code_plans", ["plan_id"], unique=False)

    bind = op.get_bind()
    existing_default = bind.execute(
        sa.text(
            "SELECT 1 FROM subscription_plans WHERE code = :code LIMIT 1"
        ),
        {"code": "premium_monthly"},
    ).first()
    if existing_default is None:
        bind.execute(
            sa.text(
                """
                INSERT INTO subscription_plans (
                    id,
                    code,
                    name,
                    description,
                    price_cents,
                    currency,
                    duration_days,
                    is_active,
                    sort_order,
                    created_at,
                    updated_at
                )
                VALUES (
                    :id,
                    :code,
                    :name,
                    :description,
                    :price_cents,
                    :currency,
                    :duration_days,
                    TRUE,
                    :sort_order,
                    NOW(),
                    NOW()
                )
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "code": "premium_monthly",
                "name": "Premium Monthly",
                "description": "Default monthly premium plan",
                "price_cents": 1000,
                "currency": "USD",
                "duration_days": 30,
                "sort_order": 10,
            },
        )


def downgrade() -> None:
    if _has_table("promo_code_plans"):
        for index_name in ("ix_promo_code_plans_plan", "ix_promo_code_plans_promo"):
            if _has_index("promo_code_plans", index_name):
                op.drop_index(index_name, table_name="promo_code_plans")
        op.drop_table("promo_code_plans")

    if _has_table("subscription_plans"):
        for index_name in (
            "ix_subscription_plans_sort_order",
            "ix_subscription_plans_active",
            "ix_subscription_plans_code",
        ):
            if _has_index("subscription_plans", index_name):
                op.drop_index(index_name, table_name="subscription_plans")
        op.drop_table("subscription_plans")

