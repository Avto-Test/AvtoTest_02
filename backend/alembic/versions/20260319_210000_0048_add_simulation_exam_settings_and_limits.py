"""add simulation exam settings and limits

Revision ID: 0048
Revises: 0047
Create Date: 2026-03-19 21:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0048"
down_revision: Union[str, None] = "0047"
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
        op.create_table(
            "simulation_exam_settings",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("mistake_limit", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("violation_limit", sa.Integer(), nullable=False, server_default="2"),
            sa.Column(
                "updated_by_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("TIMEZONE('utc', NOW())")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("TIMEZONE('utc', NOW())")),
        )
        op.execute(
            sa.text(
                """
                INSERT INTO simulation_exam_settings (id, mistake_limit, violation_limit)
                VALUES (1, 3, 2)
                ON CONFLICT (id) DO NOTHING
                """
            )
        )

    if _has_table("exam_simulation_attempts"):
        if not _has_column("exam_simulation_attempts", "mistake_limit"):
            op.add_column(
                "exam_simulation_attempts",
                sa.Column("mistake_limit", sa.Integer(), nullable=False, server_default="3"),
            )
        if not _has_column("exam_simulation_attempts", "violation_limit"):
            op.add_column(
                "exam_simulation_attempts",
                sa.Column("violation_limit", sa.Integer(), nullable=False, server_default="2"),
            )
        if not _has_column("exam_simulation_attempts", "violation_count"):
            op.add_column(
                "exam_simulation_attempts",
                sa.Column("violation_count", sa.Integer(), nullable=False, server_default="0"),
            )
        if not _has_column("exam_simulation_attempts", "disqualified"):
            op.add_column(
                "exam_simulation_attempts",
                sa.Column("disqualified", sa.Boolean(), nullable=False, server_default="false"),
            )
        if not _has_column("exam_simulation_attempts", "disqualification_reason"):
            op.add_column(
                "exam_simulation_attempts",
                sa.Column("disqualification_reason", sa.String(length=120), nullable=True),
            )


def downgrade() -> None:
    if _has_table("exam_simulation_attempts"):
        if _has_column("exam_simulation_attempts", "disqualification_reason"):
            op.drop_column("exam_simulation_attempts", "disqualification_reason")
        if _has_column("exam_simulation_attempts", "disqualified"):
            op.drop_column("exam_simulation_attempts", "disqualified")
        if _has_column("exam_simulation_attempts", "violation_count"):
            op.drop_column("exam_simulation_attempts", "violation_count")
        if _has_column("exam_simulation_attempts", "violation_limit"):
            op.drop_column("exam_simulation_attempts", "violation_limit")
        if _has_column("exam_simulation_attempts", "mistake_limit"):
            op.drop_column("exam_simulation_attempts", "mistake_limit")

    if _has_table("simulation_exam_settings"):
        op.drop_table("simulation_exam_settings")
