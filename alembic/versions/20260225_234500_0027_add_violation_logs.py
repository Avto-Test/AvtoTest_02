"""Add violation logs table

Revision ID: 0027
Revises: 0026
Create Date: 2026-02-25 23:45:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0027"
down_revision: Union[str, None] = "0026"
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
    if not _has_table("violation_logs"):
        op.create_table(
            "violation_logs",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("guest_id", sa.String(length=64), nullable=True),
            sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("event_type", sa.String(length=50), nullable=False),
            sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["test_id"], ["tests.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_violation_logs_user_id", "violation_logs", ["user_id"], unique=False)
        op.create_index("ix_violation_logs_guest_id", "violation_logs", ["guest_id"], unique=False)
        op.create_index("ix_violation_logs_test_id", "violation_logs", ["test_id"], unique=False)
        op.create_index("ix_violation_logs_attempt_id", "violation_logs", ["attempt_id"], unique=False)
        op.create_index("ix_violation_logs_event_type", "violation_logs", ["event_type"], unique=False)
        op.create_index("ix_violation_logs_created_at", "violation_logs", ["created_at"], unique=False)


def downgrade() -> None:
    if _has_table("violation_logs"):
        for index_name in (
            "ix_violation_logs_created_at",
            "ix_violation_logs_event_type",
            "ix_violation_logs_attempt_id",
            "ix_violation_logs_test_id",
            "ix_violation_logs_guest_id",
            "ix_violation_logs_user_id",
        ):
            if _has_index("violation_logs", index_name):
                op.drop_index(index_name, table_name="violation_logs")
        op.drop_table("violation_logs")
