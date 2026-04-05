"""add experiment assignments

Revision ID: 0054
Revises: 0053
Create Date: 2026-03-25 13:00:00.000000
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0054"
down_revision: Union[str, None] = "0053"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _has_table("experiments"):
        op.create_table(
            "experiments",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column(
                "variants",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[\"A\", \"B\"]'::jsonb"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_experiments_name", "experiments", ["name"], unique=True)
        op.create_index("ix_experiments_is_active", "experiments", ["is_active"], unique=False)

    if not _has_table("user_experiments"):
        op.create_table(
            "user_experiments",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("experiment_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("variant", sa.String(length=32), nullable=False),
            sa.Column(
                "assigned_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("timezone('utc', now())"),
            ),
            sa.ForeignKeyConstraint(["experiment_id"], ["experiments.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "experiment_id", name="uq_user_experiments_user_experiment"),
        )
        op.create_index("ix_user_experiments_user_id", "user_experiments", ["user_id"], unique=False)
        op.create_index("ix_user_experiments_experiment_id", "user_experiments", ["experiment_id"], unique=False)
        op.create_index("ix_user_experiments_variant", "user_experiments", ["variant"], unique=False)

    op.execute(
        sa.text(
            """
            INSERT INTO experiments (id, name, is_active, variants)
            VALUES (:experiment_id, 'upgrade_button', true, '["A", "B"]'::jsonb)
            ON CONFLICT (name) DO NOTHING
            """
        ).bindparams(experiment_id=uuid.uuid4())
    )


def downgrade() -> None:
    if _has_table("user_experiments"):
        op.drop_index("ix_user_experiments_variant", table_name="user_experiments")
        op.drop_index("ix_user_experiments_experiment_id", table_name="user_experiments")
        op.drop_index("ix_user_experiments_user_id", table_name="user_experiments")
        op.drop_table("user_experiments")

    if _has_table("experiments"):
        op.drop_index("ix_experiments_is_active", table_name="experiments")
        op.drop_index("ix_experiments_name", table_name="experiments")
        op.drop_table("experiments")
