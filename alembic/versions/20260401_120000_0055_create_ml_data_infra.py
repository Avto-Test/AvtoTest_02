"""create_ml_data_infra

Revision ID: 0055
Revises: 0054
Create Date: 2026-04-01 12:00:00.000000+00:00

"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0055"
down_revision: Union[str, None] = "0054"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _duration_seconds(started_at, ended_at) -> int | None:
    if started_at is None or ended_at is None:
        return None
    delta = ended_at - started_at
    return max(0, int(delta.total_seconds()))


def upgrade() -> None:
    op.add_column(
        "attempt_answers",
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
    )
    op.add_column(
        "attempt_answers",
        sa.Column("question_position", sa.Integer(), nullable=True),
    )
    op.add_column(
        "attempt_answers",
        sa.Column("topic_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "attempt_answers",
        sa.Column("topic_label", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "attempt_answers",
        sa.Column(
            "answered_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_attempt_answers_answered_at",
        "attempt_answers",
        ["answered_at"],
        unique=False,
    )
    op.create_index(
        "ix_attempt_answers_topic_id",
        "attempt_answers",
        ["topic_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_attempt_answers_topic_id_question_categories",
        "attempt_answers",
        "question_categories",
        ["topic_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("attempt_id", sa.UUID(), nullable=True),
        sa.Column("session_type", sa.String(length=50), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_sessions_attempt_id", "user_sessions", ["attempt_id"], unique=False)
    op.create_index("ix_user_sessions_created_at", "user_sessions", ["created_at"], unique=False)
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"], unique=False)
    op.create_index("ix_user_sessions_session_type", "user_sessions", ["session_type"], unique=False)

    op.create_table(
        "user_prediction_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("attempt_id", sa.UUID(), nullable=True),
        sa.Column("trigger_source", sa.String(length=50), nullable=False),
        sa.Column("snapshot_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_activity_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_5_avg", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_5_std", sa.Float(), nullable=False, server_default="0"),
        sa.Column("improvement_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overall_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("avg_response_time", sa.Float(), nullable=False, server_default="0"),
        sa.Column("response_time_variance", sa.Float(), nullable=False, server_default="0"),
        sa.Column("weakest_topic_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("strongest_topic_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("topic_entropy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("consistency_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_prediction_snapshots_attempt_id", "user_prediction_snapshots", ["attempt_id"], unique=False)
    op.create_index("ix_user_prediction_snapshots_created_at", "user_prediction_snapshots", ["created_at"], unique=False)
    op.create_index("ix_user_prediction_snapshots_snapshot_time", "user_prediction_snapshots", ["snapshot_time"], unique=False)
    op.create_index("ix_user_prediction_snapshots_trigger_source", "user_prediction_snapshots", ["trigger_source"], unique=False)
    op.create_index("ix_user_prediction_snapshots_user_id", "user_prediction_snapshots", ["user_id"], unique=False)

    op.create_table(
        "user_exam_results",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("exam_result", sa.Integer(), nullable=False),
        sa.Column("exam_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("exam_result IN (0, 1)", name="ck_user_exam_results_binary"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_exam_results_created_at", "user_exam_results", ["created_at"], unique=False)
    op.create_index("ix_user_exam_results_exam_date", "user_exam_results", ["exam_date"], unique=False)
    op.create_index("ix_user_exam_results_user_id", "user_exam_results", ["user_id"], unique=False)

    op.create_table(
        "ml_dataset",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("exam_result_id", sa.UUID(), nullable=False),
        sa.Column("snapshot_id", sa.UUID(), nullable=False),
        sa.Column("features", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("snapshot_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_5_avg", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_5_std", sa.Float(), nullable=False, server_default="0"),
        sa.Column("improvement_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overall_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("avg_response_time", sa.Float(), nullable=False, server_default="0"),
        sa.Column("response_time_variance", sa.Float(), nullable=False, server_default="0"),
        sa.Column("weakest_topic_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("strongest_topic_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("topic_entropy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("consistency_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("label", sa.Integer(), nullable=False),
        sa.Column("time_gap_days", sa.Float(), nullable=False, server_default="0"),
        sa.Column("activity_gap_days", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("confidence_band", sa.String(length=20), nullable=False, server_default="low"),
        sa.Column("is_usable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("quality_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("built_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["exam_result_id"], ["user_exam_results.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["snapshot_id"], ["user_prediction_snapshots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_result_id"),
    )
    op.create_index("ix_ml_dataset_built_at", "ml_dataset", ["built_at"], unique=False)
    op.create_index("ix_ml_dataset_exam_result_id", "ml_dataset", ["exam_result_id"], unique=True)
    op.create_index("ix_ml_dataset_snapshot_id", "ml_dataset", ["snapshot_id"], unique=False)
    op.create_index("ix_ml_dataset_user_id", "ml_dataset", ["user_id"], unique=False)

    connection = op.get_bind()

    connection.execute(
        sa.text(
            """
            UPDATE attempt_answers AS aa
            SET
                answered_at = COALESCE(a.finished_at, a.started_at, CURRENT_TIMESTAMP),
                response_time_ms = CASE
                    WHEN a.avg_response_time IS NOT NULL THEN ROUND(a.avg_response_time)::integer
                    ELSE NULL
                END,
                topic_id = q.category_id,
                topic_label = COALESCE(qc.name, q.category, q.topic, 'General')
            FROM attempts AS a
            JOIN questions AS q ON q.id = aa.question_id
            LEFT JOIN question_categories AS qc ON qc.id = q.category_id
            WHERE aa.attempt_id = a.id
            """
        )
    )

    op.alter_column("attempt_answers", "answered_at", nullable=False)
    op.alter_column("attempt_answers", "answered_at", server_default=None)

    attempts = connection.execute(
        sa.text(
            """
            SELECT id, user_id, started_at, finished_at, mode, question_count, time_limit_seconds
            FROM attempts
            """
        )
    ).mappings().all()
    if attempts:
        user_sessions_table = sa.table(
            "user_sessions",
            sa.column("id", sa.UUID()),
            sa.column("user_id", sa.UUID()),
            sa.column("attempt_id", sa.UUID()),
            sa.column("session_type", sa.String()),
            sa.column("started_at", sa.DateTime(timezone=True)),
            sa.column("ended_at", sa.DateTime(timezone=True)),
            sa.column("last_activity_at", sa.DateTime(timezone=True)),
            sa.column("duration_seconds", sa.Integer()),
            sa.column("metadata", postgresql.JSONB(astext_type=sa.Text())),
            sa.column("created_at", sa.DateTime(timezone=True)),
            sa.column("updated_at", sa.DateTime(timezone=True)),
        )
        payload = [
            {
                "id": uuid.uuid4(),
                "user_id": row["user_id"],
                "attempt_id": row["id"],
                "session_type": "attempt",
                "started_at": row["started_at"],
                "ended_at": row["finished_at"],
                "last_activity_at": row["finished_at"] or row["started_at"],
                "duration_seconds": _duration_seconds(row["started_at"], row["finished_at"]),
                "metadata": {
                    "mode": row["mode"],
                    "question_count": row["question_count"],
                    "time_limit_seconds": row["time_limit_seconds"],
                    "backfilled": True,
                },
                "created_at": row["started_at"],
                "updated_at": row["finished_at"] or row["started_at"],
            }
            for row in attempts
        ]
        op.bulk_insert(user_sessions_table, payload)


def downgrade() -> None:
    op.drop_index("ix_ml_dataset_user_id", table_name="ml_dataset")
    op.drop_index("ix_ml_dataset_snapshot_id", table_name="ml_dataset")
    op.drop_index("ix_ml_dataset_exam_result_id", table_name="ml_dataset")
    op.drop_index("ix_ml_dataset_built_at", table_name="ml_dataset")
    op.drop_table("ml_dataset")

    op.drop_index("ix_user_exam_results_user_id", table_name="user_exam_results")
    op.drop_index("ix_user_exam_results_exam_date", table_name="user_exam_results")
    op.drop_index("ix_user_exam_results_created_at", table_name="user_exam_results")
    op.drop_table("user_exam_results")

    op.drop_index("ix_user_prediction_snapshots_user_id", table_name="user_prediction_snapshots")
    op.drop_index("ix_user_prediction_snapshots_trigger_source", table_name="user_prediction_snapshots")
    op.drop_index("ix_user_prediction_snapshots_snapshot_time", table_name="user_prediction_snapshots")
    op.drop_index("ix_user_prediction_snapshots_created_at", table_name="user_prediction_snapshots")
    op.drop_index("ix_user_prediction_snapshots_attempt_id", table_name="user_prediction_snapshots")
    op.drop_table("user_prediction_snapshots")

    op.drop_index("ix_user_sessions_session_type", table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_index("ix_user_sessions_created_at", table_name="user_sessions")
    op.drop_index("ix_user_sessions_attempt_id", table_name="user_sessions")
    op.drop_table("user_sessions")

    op.drop_constraint(
        "fk_attempt_answers_topic_id_question_categories",
        "attempt_answers",
        type_="foreignkey",
    )
    op.drop_index("ix_attempt_answers_topic_id", table_name="attempt_answers")
    op.drop_index("ix_attempt_answers_answered_at", table_name="attempt_answers")
    op.drop_column("attempt_answers", "answered_at")
    op.drop_column("attempt_answers", "topic_label")
    op.drop_column("attempt_answers", "topic_id")
    op.drop_column("attempt_answers", "question_position")
    op.drop_column("attempt_answers", "response_time_ms")
