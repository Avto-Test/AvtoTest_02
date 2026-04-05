"""create feature flag catalog

Revision ID: 0056
Revises: 0055
Create Date: 2026-04-04 12:00:00.000000+00:00

"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0056"
down_revision: Union[str, None] = "0055"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_FEATURES = (
    {
        "id": uuid.uuid4(),
        "key": "analytics_view",
        "name": "Advanced Analytics",
        "is_premium": True,
    },
    {
        "id": uuid.uuid4(),
        "key": "ai_prediction",
        "name": "AI Prediction",
        "is_premium": True,
    },
    {
        "id": uuid.uuid4(),
        "key": "simulation_run",
        "name": "Simulation Run",
        "is_premium": True,
    },
)


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "features",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enabled_for_all_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_features_key", "features", ["key"], unique=True)

    features_table = sa.table(
        "features",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("key", sa.String(length=100)),
        sa.column("name", sa.String(length=255)),
        sa.column("is_premium", sa.Boolean()),
    )
    op.bulk_insert(features_table, list(DEFAULT_FEATURES))

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users AS u
            SET
                is_premium = CASE
                    WHEN s.plan <> 'free'
                     AND s.status IN ('active', 'trialing')
                     AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
                    THEN TRUE
                    ELSE FALSE
                END,
                subscription_expires_at = CASE
                    WHEN s.plan <> 'free'
                     AND s.status IN ('active', 'trialing')
                     AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
                    THEN s.expires_at
                    ELSE NULL
                END
            FROM subscriptions AS s
            WHERE s.user_id = u.id
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_features_key", table_name="features")
    op.drop_table("features")

    op.drop_column("users", "subscription_expires_at")
    op.drop_column("users", "is_premium")
