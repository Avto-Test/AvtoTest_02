"""Add payments table and subscription lifecycle columns

Revision ID: 0023
Revises: 0022
Create Date: 2026-02-24 13:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def _has_unique_constraint(table_name: str, constraint_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(
        constraint.get("name") == constraint_name
        for constraint in inspector.get_unique_constraints(table_name)
    )


def upgrade() -> None:
    if not _has_table("analytics_events"):
        op.create_table(
            "analytics_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("event_name", sa.String(length=100), nullable=False),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_analytics_events_user_id", "analytics_events", ["user_id"], unique=False)
        op.create_index("ix_analytics_events_event_name", "analytics_events", ["event_name"], unique=False)
        op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"], unique=False)

    if not _has_table("payments"):
        op.create_table(
            "payments",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("provider", sa.String(length=50), nullable=False, server_default="tspay"),
            sa.Column("provider_event_id", sa.String(length=255), nullable=True),
            sa.Column("provider_session_id", sa.String(length=255), nullable=True),
            sa.Column("provider_payment_id", sa.String(length=255), nullable=True),
            sa.Column("event_type", sa.String(length=100), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("amount_cents", sa.Integer(), nullable=True),
            sa.Column("currency", sa.String(length=10), nullable=True),
            sa.Column("idempotency_key", sa.String(length=255), nullable=True),
            sa.Column("signature", sa.Text(), nullable=True),
            sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("provider_event_id", name="uq_payments_provider_event_id"),
            sa.UniqueConstraint("idempotency_key", name="uq_payments_idempotency_key"),
        )
        op.create_index("ix_payments_user_id", "payments", ["user_id"], unique=False)
        op.create_index("ix_payments_provider", "payments", ["provider"], unique=False)
        op.create_index("ix_payments_provider_event_id", "payments", ["provider_event_id"], unique=False)
        op.create_index("ix_payments_provider_session_id", "payments", ["provider_session_id"], unique=False)
        op.create_index("ix_payments_provider_payment_id", "payments", ["provider_payment_id"], unique=False)
        op.create_index("ix_payments_status", "payments", ["status"], unique=False)
        op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"], unique=False)

    if not _has_column("subscriptions", "status"):
        op.add_column(
            "subscriptions",
            sa.Column("status", sa.String(length=50), nullable=False, server_default="inactive"),
        )
    if not _has_column("subscriptions", "provider"):
        op.add_column(
            "subscriptions",
            sa.Column("provider", sa.String(length=50), nullable=False, server_default="tspay"),
        )
    if not _has_column("subscriptions", "provider_subscription_id"):
        op.add_column(
            "subscriptions",
            sa.Column("provider_subscription_id", sa.String(length=255), nullable=True),
        )
    if not _has_column("subscriptions", "starts_at"):
        op.add_column(
            "subscriptions",
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        )
    if not _has_column("subscriptions", "canceled_at"):
        op.add_column(
            "subscriptions",
            sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        )
    if not _has_column("subscriptions", "cancel_at_period_end"):
        op.add_column(
            "subscriptions",
            sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if not _has_column("subscriptions", "updated_at"):
        op.add_column(
            "subscriptions",
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    op.execute(
        """
        UPDATE subscriptions
        SET status = CASE
            WHEN plan = 'premium' AND (expires_at IS NULL OR expires_at > NOW()) THEN 'active'
            WHEN plan = 'premium' AND expires_at <= NOW() THEN 'expired'
            ELSE 'inactive'
        END
        """
    )
    op.execute(
        """
        UPDATE subscriptions
        SET starts_at = COALESCE(starts_at, created_at),
            updated_at = COALESCE(updated_at, created_at, NOW())
        """
    )

    if not _has_index("subscriptions", "ix_subscriptions_status_expires"):
        op.create_index(
            "ix_subscriptions_status_expires",
            "subscriptions",
            ["status", "expires_at"],
            unique=False,
        )

    if not _has_unique_constraint("subscriptions", "uq_subscriptions_provider_subscription_id"):
        op.create_unique_constraint(
            "uq_subscriptions_provider_subscription_id",
            "subscriptions",
            ["provider_subscription_id"],
        )


def downgrade() -> None:
    if _has_unique_constraint("subscriptions", "uq_subscriptions_provider_subscription_id"):
        op.drop_constraint(
            "uq_subscriptions_provider_subscription_id",
            "subscriptions",
            type_="unique",
        )

    if _has_index("subscriptions", "ix_subscriptions_status_expires"):
        op.drop_index("ix_subscriptions_status_expires", table_name="subscriptions")

    for column_name in (
        "updated_at",
        "cancel_at_period_end",
        "canceled_at",
        "starts_at",
        "provider_subscription_id",
        "provider",
        "status",
    ):
        if _has_column("subscriptions", column_name):
            op.drop_column("subscriptions", column_name)

    if _has_table("payments"):
        for index_name in (
            "ix_payments_idempotency_key",
            "ix_payments_status",
            "ix_payments_provider_payment_id",
            "ix_payments_provider_session_id",
            "ix_payments_provider_event_id",
            "ix_payments_provider",
            "ix_payments_user_id",
        ):
            if _has_index("payments", index_name):
                op.drop_index(index_name, table_name="payments")
        op.drop_table("payments")

    # Keep analytics_events table if already used by analytics stack.
