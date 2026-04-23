"""create learning engine tables

Revision ID: 0042
Revises: 0041
Create Date: 2026-03-10 15:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0042"
down_revision: Union[str, None] = "0041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _has_table("user_topic_stats"):
        op.create_table(
            "user_topic_stats",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "topic_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("question_categories.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("total_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("correct_answers", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("wrong_answers", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("accuracy_rate", sa.Float(), nullable=False, server_default="0"),
            sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("user_id", "topic_id", name="uq_user_topic_stats_user_topic"),
        )
        op.create_index("ix_user_topic_stats_user_id", "user_topic_stats", ["user_id"], unique=False)
        op.create_index("ix_user_topic_stats_topic_id", "user_topic_stats", ["topic_id"], unique=False)
        op.create_index("ix_user_topic_stats_user_topic", "user_topic_stats", ["user_id", "topic_id"], unique=False)

    if not _has_table("question_difficulty"):
        op.create_table(
            "question_difficulty",
            sa.Column(
                "question_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("questions.id", ondelete="CASCADE"),
                primary_key=True,
                nullable=False,
            ),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("wrong_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("difficulty_score", sa.Float(), nullable=False, server_default="0"),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    if not _has_table("review_queue"):
        op.create_table(
            "review_queue",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "question_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("questions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("interval_days", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("last_result", sa.String(length=16), nullable=False, server_default="wrong"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("user_id", "question_id", name="uq_review_queue_user_question"),
        )
        op.create_index("ix_review_queue_user_id", "review_queue", ["user_id"], unique=False)
        op.create_index("ix_review_queue_question_id", "review_queue", ["question_id"], unique=False)
        op.create_index("ix_review_queue_user_question", "review_queue", ["user_id", "question_id"], unique=False)
        op.create_index("ix_review_queue_user_next_review", "review_queue", ["user_id", "next_review_at"], unique=False)


def downgrade() -> None:
    if _has_table("review_queue"):
        op.drop_index("ix_review_queue_user_next_review", table_name="review_queue")
        op.drop_index("ix_review_queue_user_question", table_name="review_queue")
        op.drop_index("ix_review_queue_question_id", table_name="review_queue")
        op.drop_index("ix_review_queue_user_id", table_name="review_queue")
        op.drop_table("review_queue")

    if _has_table("question_difficulty"):
        op.drop_table("question_difficulty")

    if _has_table("user_topic_stats"):
        op.drop_index("ix_user_topic_stats_user_topic", table_name="user_topic_stats")
        op.drop_index("ix_user_topic_stats_topic_id", table_name="user_topic_stats")
        op.drop_index("ix_user_topic_stats_user_id", table_name="user_topic_stats")
        op.drop_table("user_topic_stats")
