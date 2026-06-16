"""Create attempts and attempt_answers tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-07 00:39:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create attempts table
    op.create_table(
        "attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, default=0),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"], ondelete="CASCADE"),
    )
    op.create_index(
        op.f("ix_attempts_user_id"),
        "attempts",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attempts_test_id"),
        "attempts",
        ["test_id"],
        unique=False,
    )
    
    # Create attempt_answers table
    op.create_table(
        "attempt_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("selected_option_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["selected_option_id"], ["answer_options.id"], ondelete="CASCADE"),
    )
    op.create_index(
        op.f("ix_attempt_answers_attempt_id"),
        "attempt_answers",
        ["attempt_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_attempt_answers_attempt_id"), table_name="attempt_answers")
    op.drop_table("attempt_answers")
    op.drop_index(op.f("ix_attempts_test_id"), table_name="attempts")
    op.drop_index(op.f("ix_attempts_user_id"), table_name="attempts")
    op.drop_table("attempts")
