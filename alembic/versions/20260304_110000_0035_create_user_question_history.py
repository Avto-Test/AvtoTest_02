"""create user_question_history table

Revision ID: f4c8d1b27a9e
Revises: c18b2f7a9d01
Create Date: 2026-03-04 11:00:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f4c8d1b27a9e"
down_revision: Union[str, None] = "c18b2f7a9d01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(idx.get("name") == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_table("user_question_history"):
        op.create_table(
            "user_question_history",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("correct_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_correct_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "question_id", name="uq_user_question_history_user_question"),
        )

    if not _has_index("user_question_history", "ix_user_question_history_user_id"):
        op.create_index("ix_user_question_history_user_id", "user_question_history", ["user_id"], unique=False)
    if not _has_index("user_question_history", "ix_user_question_history_question_id"):
        op.create_index("ix_user_question_history_question_id", "user_question_history", ["question_id"], unique=False)


def downgrade() -> None:
    if _has_table("user_question_history"):
        if _has_index("user_question_history", "ix_user_question_history_question_id"):
            op.drop_index("ix_user_question_history_question_id", table_name="user_question_history")
        if _has_index("user_question_history", "ix_user_question_history_user_id"):
            op.drop_index("ix_user_question_history_user_id", table_name="user_question_history")
        op.drop_table("user_question_history")

