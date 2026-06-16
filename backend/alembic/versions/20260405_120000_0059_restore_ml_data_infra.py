"""
AUTOTEST Restore missing ML data infrastructure objects

Revision ID: 0059
Revises: 0058
Create Date: 2026-04-05 12:00:00.000000+00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision = "0059"
down_revision = "0058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS response_time_ms integer;")
    op.execute("ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS question_position integer;")
    op.execute("ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS topic_id uuid;")
    op.execute("ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS topic_label varchar(255);")
    op.execute(
        "ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS answered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;"
    )
    op.execute(
        """
        UPDATE attempt_answers aa
        SET answered_at = COALESCE(a.finished_at, a.started_at, CURRENT_TIMESTAMP)
        FROM attempts a
        WHERE aa.attempt_id = a.id
          AND aa.answered_at IS NULL;
        """
    )
    op.execute("ALTER TABLE attempt_answers ALTER COLUMN answered_at SET NOT NULL;")
    op.execute("ALTER TABLE attempt_answers ALTER COLUMN answered_at DROP DEFAULT;")
    op.execute("CREATE INDEX IF NOT EXISTS ix_attempt_answers_answered_at ON attempt_answers (answered_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_attempt_answers_topic_id ON attempt_answers (topic_id);")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                WHERE c.conname = 'fk_attempt_answers_topic_id_question_categories'
                  AND t.relname = 'attempt_answers'
            ) THEN
                ALTER TABLE attempt_answers
                ADD CONSTRAINT fk_attempt_answers_topic_id_question_categories
                    FOREIGN KEY (topic_id)
                    REFERENCES question_categories (id)
                    ON DELETE SET NULL;
            END IF;
        END$$;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id uuid PRIMARY KEY,
            user_id uuid NOT NULL,
            attempt_id uuid NULL,
            session_type varchar(50) NOT NULL,
            started_at timestamp with time zone NOT NULL,
            ended_at timestamp with time zone NULL,
            last_activity_at timestamp with time zone NULL,
            duration_seconds integer NULL,
            metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_user_sessions_attempt_id_attempts FOREIGN KEY (attempt_id) REFERENCES attempts (id) ON DELETE CASCADE,
            CONSTRAINT fk_user_sessions_user_id_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_attempt_id ON user_sessions (attempt_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_created_at ON user_sessions (created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_session_type ON user_sessions (session_type);")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_prediction_snapshots (
            id uuid PRIMARY KEY,
            user_id uuid NOT NULL,
            attempt_id uuid NULL,
            trigger_source varchar(50) NOT NULL,
            snapshot_time timestamp with time zone NOT NULL,
            last_activity_time timestamp with time zone NULL,
            last_score double precision NOT NULL DEFAULT 0,
            last_5_avg double precision NOT NULL DEFAULT 0,
            last_5_std double precision NOT NULL DEFAULT 0,
            improvement_rate double precision NOT NULL DEFAULT 0,
            total_attempts integer NOT NULL DEFAULT 0,
            overall_accuracy double precision NOT NULL DEFAULT 0,
            avg_response_time double precision NOT NULL DEFAULT 0,
            response_time_variance double precision NOT NULL DEFAULT 0,
            weakest_topic_accuracy double precision NOT NULL DEFAULT 0,
            strongest_topic_accuracy double precision NOT NULL DEFAULT 0,
            topic_entropy double precision NOT NULL DEFAULT 0,
            consistency_score double precision NOT NULL DEFAULT 0,
            created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_user_prediction_snapshots_attempt_id_attempts FOREIGN KEY (attempt_id) REFERENCES attempts (id) ON DELETE SET NULL,
            CONSTRAINT fk_user_prediction_snapshots_user_id_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_prediction_snapshots_attempt_id ON user_prediction_snapshots (attempt_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_prediction_snapshots_created_at ON user_prediction_snapshots (created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_prediction_snapshots_snapshot_time ON user_prediction_snapshots (snapshot_time);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_prediction_snapshots_trigger_source ON user_prediction_snapshots (trigger_source);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_prediction_snapshots_user_id ON user_prediction_snapshots (user_id);")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_exam_results (
            id uuid PRIMARY KEY,
            user_id uuid NOT NULL,
            exam_result integer NOT NULL,
            exam_date timestamp with time zone NOT NULL,
            created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT ck_user_exam_results_binary CHECK (exam_result IN (0, 1)),
            CONSTRAINT fk_user_exam_results_user_id_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_exam_results_created_at ON user_exam_results (created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_exam_results_exam_date ON user_exam_results (exam_date);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_exam_results_user_id ON user_exam_results (user_id);")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS ml_dataset (
            id uuid PRIMARY KEY,
            user_id uuid NOT NULL,
            exam_result_id uuid NOT NULL,
            snapshot_id uuid NOT NULL,
            features jsonb NOT NULL DEFAULT '{}'::jsonb,
            snapshot_time timestamp with time zone NOT NULL,
            last_score double precision NOT NULL DEFAULT 0,
            last_5_avg double precision NOT NULL DEFAULT 0,
            last_5_std double precision NOT NULL DEFAULT 0,
            improvement_rate double precision NOT NULL DEFAULT 0,
            total_attempts integer NOT NULL DEFAULT 0,
            overall_accuracy double precision NOT NULL DEFAULT 0,
            avg_response_time double precision NOT NULL DEFAULT 0,
            response_time_variance double precision NOT NULL DEFAULT 0,
            weakest_topic_accuracy double precision NOT NULL DEFAULT 0,
            strongest_topic_accuracy double precision NOT NULL DEFAULT 0,
            topic_entropy double precision NOT NULL DEFAULT 0,
            consistency_score double precision NOT NULL DEFAULT 0,
            label integer NOT NULL,
            time_gap_days double precision NOT NULL DEFAULT 0,
            activity_gap_days double precision NULL,
            confidence_score double precision NOT NULL DEFAULT 0,
            confidence_band varchar(20) NOT NULL DEFAULT 'low',
            is_usable boolean NOT NULL DEFAULT false,
            quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
            built_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_ml_dataset_exam_result_id_user_exam_results FOREIGN KEY (exam_result_id) REFERENCES user_exam_results (id) ON DELETE CASCADE,
            CONSTRAINT fk_ml_dataset_snapshot_id_user_prediction_snapshots FOREIGN KEY (snapshot_id) REFERENCES user_prediction_snapshots (id) ON DELETE CASCADE,
            CONSTRAINT fk_ml_dataset_user_id_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT uq_ml_dataset_exam_result_id UNIQUE (exam_result_id)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_ml_dataset_built_at ON ml_dataset (built_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ml_dataset_exam_result_id ON ml_dataset (exam_result_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ml_dataset_snapshot_id ON ml_dataset (snapshot_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ml_dataset_user_id ON ml_dataset (user_id);")

    user_sessions_table = sa.table(
        "user_sessions",
        sa.column("id", postgresql.UUID()),
        sa.column("user_id", postgresql.UUID()),
        sa.column("attempt_id", postgresql.UUID()),
        sa.column("session_type", sa.String()),
        sa.column("started_at", sa.DateTime(timezone=True)),
        sa.column("ended_at", sa.DateTime(timezone=True)),
        sa.column("last_activity_at", sa.DateTime(timezone=True)),
        sa.column("duration_seconds", sa.Integer()),
        sa.column("metadata", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )

    attempts = op.get_bind().execute(
        sa.text(
            "SELECT id, user_id, started_at, finished_at, mode, question_count, time_limit_seconds "
            "FROM attempts"
        )
    ).mappings().all()

    if attempts:
        payload = [
            {
                "id": uuid.uuid4(),
                "user_id": row["user_id"],
                "attempt_id": row["id"],
                "session_type": "attempt",
                "started_at": row["started_at"],
                "ended_at": row["finished_at"],
                "last_activity_at": row["finished_at"] or row["started_at"],
                "duration_seconds": (
                    None
                    if row["started_at"] is None or row["finished_at"] is None
                    else max(0, int((row["finished_at"] - row["started_at"]).total_seconds()))
                ),
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
    op.execute("DROP TABLE IF EXISTS ml_dataset CASCADE;")
    op.execute("DROP TABLE IF EXISTS user_exam_results CASCADE;")
    op.execute("DROP TABLE IF EXISTS user_prediction_snapshots CASCADE;")
    op.execute("DROP TABLE IF EXISTS user_sessions CASCADE;")
    op.execute("ALTER TABLE attempt_answers DROP CONSTRAINT IF EXISTS fk_attempt_answers_topic_id_question_categories;")
    op.execute("DROP INDEX IF EXISTS ix_attempt_answers_topic_id;")
    op.execute("DROP INDEX IF EXISTS ix_attempt_answers_answered_at;")
    op.execute("ALTER TABLE attempt_answers DROP COLUMN IF EXISTS topic_id;")
    op.execute("ALTER TABLE attempt_answers DROP COLUMN IF EXISTS topic_label;")
    op.execute("ALTER TABLE attempt_answers DROP COLUMN IF EXISTS response_time_ms;")
    op.execute("ALTER TABLE attempt_answers DROP COLUMN IF EXISTS question_position;")
    op.execute("ALTER TABLE attempt_answers DROP COLUMN IF EXISTS answered_at;")
