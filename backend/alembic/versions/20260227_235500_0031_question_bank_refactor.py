"""question bank refactor: categories, adaptive profile, notifications

Revision ID: f91d7ab82e31
Revises: b4c16de23a77
Create Date: 2026-02-27 23:55:00

"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f91d7ab82e31"
down_revision: Union[str, None] = "b4c16de23a77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col.get("name") == column_name for col in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def _has_fk(table_name: str, fk_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(fk.get("name") == fk_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    if not _has_table("question_categories"):
        op.create_table(
            "question_categories",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("question_categories", "ix_question_categories_name"):
        op.create_index("ix_question_categories_name", "question_categories", ["name"], unique=True)
    if not _has_index("question_categories", "ix_question_categories_is_active"):
        op.create_index("ix_question_categories_is_active", "question_categories", ["is_active"], unique=False)

    if _has_table("questions"):
        if not _has_column("questions", "category_id"):
            op.add_column("questions", sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True))
        if not _has_column("questions", "difficulty_percent"):
            op.add_column(
                "questions",
                sa.Column("difficulty_percent", sa.Integer(), server_default="50", nullable=False),
            )

        op.execute(
            """
            UPDATE questions
            SET difficulty_percent = CASE
                WHEN difficulty = 'easy' THEN 70
                WHEN difficulty = 'hard' THEN 30
                ELSE 50
            END
            WHERE difficulty_percent IS NULL OR difficulty_percent = 50
            """
        )

        # Backfill normalized category rows from legacy text category values.
        bind = op.get_bind()
        existing_names = {
            row[0].strip().lower()
            for row in bind.execute(sa.text("SELECT name FROM question_categories")).fetchall()
            if row[0]
        }
        category_rows = bind.execute(
            sa.text(
                """
                SELECT DISTINCT trim(category) AS name
                FROM questions
                WHERE category IS NOT NULL AND trim(category) <> ''
                """
            )
        ).fetchall()
        for row in category_rows:
            raw_name = (row[0] or "").strip()
            if not raw_name:
                continue
            key = raw_name.lower()
            if key in existing_names:
                continue
            bind.execute(
                sa.text(
                    """
                    INSERT INTO question_categories (id, name, description, is_active, created_at, updated_at)
                    VALUES (:id, :name, NULL, true, now(), now())
                    """
                ),
                {"id": uuid.uuid4(), "name": raw_name},
            )
            existing_names.add(key)

        op.execute(
            """
            UPDATE questions q
            SET category_id = qc.id
            FROM question_categories qc
            WHERE q.category_id IS NULL
              AND q.category IS NOT NULL
              AND lower(trim(q.category)) = lower(qc.name)
            """
        )

        if not _has_fk("questions", "fk_questions_category_id_question_categories"):
            op.create_foreign_key(
                "fk_questions_category_id_question_categories",
                "questions",
                "question_categories",
                ["category_id"],
                ["id"],
                ondelete="SET NULL",
            )
        if not _has_index("questions", "ix_questions_category_id"):
            op.create_index("ix_questions_category_id", "questions", ["category_id"], unique=False)
        if not _has_index("questions", "ix_questions_difficulty_percent"):
            op.create_index("ix_questions_difficulty_percent", "questions", ["difficulty_percent"], unique=False)

    if not _has_table("user_adaptive_profiles"):
        op.create_table(
            "user_adaptive_profiles",
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("target_difficulty_percent", sa.Integer(), server_default="50", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id"),
        )

    if not _has_table("user_notifications"):
        op.create_table(
            "user_notifications",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("notification_type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
            sa.Column("is_read", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("user_notifications", "ix_user_notifications_user_id"):
        op.create_index("ix_user_notifications_user_id", "user_notifications", ["user_id"], unique=False)
    if not _has_index("user_notifications", "ix_user_notifications_notification_type"):
        op.create_index(
            "ix_user_notifications_notification_type",
            "user_notifications",
            ["notification_type"],
            unique=False,
        )
    if not _has_index("user_notifications", "ix_user_notifications_is_read"):
        op.create_index("ix_user_notifications_is_read", "user_notifications", ["is_read"], unique=False)
    if not _has_index("user_notifications", "ix_user_notifications_created_at"):
        op.create_index("ix_user_notifications_created_at", "user_notifications", ["created_at"], unique=False)


def downgrade() -> None:
    if _has_table("user_notifications"):
        if _has_index("user_notifications", "ix_user_notifications_created_at"):
            op.drop_index("ix_user_notifications_created_at", table_name="user_notifications")
        if _has_index("user_notifications", "ix_user_notifications_is_read"):
            op.drop_index("ix_user_notifications_is_read", table_name="user_notifications")
        if _has_index("user_notifications", "ix_user_notifications_notification_type"):
            op.drop_index("ix_user_notifications_notification_type", table_name="user_notifications")
        if _has_index("user_notifications", "ix_user_notifications_user_id"):
            op.drop_index("ix_user_notifications_user_id", table_name="user_notifications")
        op.drop_table("user_notifications")

    if _has_table("user_adaptive_profiles"):
        op.drop_table("user_adaptive_profiles")

    if _has_table("questions"):
        if _has_index("questions", "ix_questions_difficulty_percent"):
            op.drop_index("ix_questions_difficulty_percent", table_name="questions")
        if _has_index("questions", "ix_questions_category_id"):
            op.drop_index("ix_questions_category_id", table_name="questions")
        if _has_fk("questions", "fk_questions_category_id_question_categories"):
            op.drop_constraint("fk_questions_category_id_question_categories", "questions", type_="foreignkey")
        if _has_column("questions", "difficulty_percent"):
            op.drop_column("questions", "difficulty_percent")
        if _has_column("questions", "category_id"):
            op.drop_column("questions", "category_id")

    if _has_table("question_categories"):
        if _has_index("question_categories", "ix_question_categories_is_active"):
            op.drop_index("ix_question_categories_is_active", table_name="question_categories")
        if _has_index("question_categories", "ix_question_categories_name"):
            op.drop_index("ix_question_categories_name", table_name="question_categories")
        op.drop_table("question_categories")
