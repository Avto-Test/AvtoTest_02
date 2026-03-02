"""Add guest attempts tables

Revision ID: 0026
Revises: 0025
Create Date: 2026-02-25 23:30:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0026"
down_revision: Union[str, None] = "0025"
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
    if not _has_table("guest_attempts"):
        op.create_table(
            "guest_attempts",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("guest_id", sa.String(length=64), nullable=False),
            sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["test_id"], ["tests.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_guest_attempts_guest_id", "guest_attempts", ["guest_id"], unique=False)
        op.create_index("ix_guest_attempts_test_id", "guest_attempts", ["test_id"], unique=False)
        op.create_index("ix_guest_attempts_started_at", "guest_attempts", ["started_at"], unique=False)

    if not _has_table("guest_attempt_answers"):
        op.create_table(
            "guest_attempt_answers",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("selected_option_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("is_correct", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.ForeignKeyConstraint(["attempt_id"], ["guest_attempts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["selected_option_id"], ["answer_options.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_guest_attempt_answers_attempt", "guest_attempt_answers", ["attempt_id"], unique=False)
        op.create_index("ix_guest_attempt_answers_question", "guest_attempt_answers", ["question_id"], unique=False)


def downgrade() -> None:
    if _has_table("guest_attempt_answers"):
        for index_name in (
            "ix_guest_attempt_answers_question",
            "ix_guest_attempt_answers_attempt",
        ):
            if _has_index("guest_attempt_answers", index_name):
                op.drop_index(index_name, table_name="guest_attempt_answers")
        op.drop_table("guest_attempt_answers")

    if _has_table("guest_attempts"):
        for index_name in (
            "ix_guest_attempts_started_at",
            "ix_guest_attempts_test_id",
            "ix_guest_attempts_guest_id",
        ):
            if _has_index("guest_attempts", index_name):
                op.drop_index(index_name, table_name="guest_attempts")
        op.drop_table("guest_attempts")
