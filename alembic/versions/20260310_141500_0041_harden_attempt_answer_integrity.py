"""harden attempt answer integrity

Revision ID: 0041
Revises: 0040
Create Date: 2026-03-10 14:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0041"
down_revision: Union[str, None] = "0040"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _has_unique_constraint(table_name: str, constraint_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(
        constraint["name"] == constraint_name
        for constraint in inspector.get_unique_constraints(table_name)
    )


def _deduplicate_attempt_answers(table_name: str) -> None:
    op.execute(
        sa.text(
            f"""
            DELETE FROM {table_name} older
            USING {table_name} newer
            WHERE older.attempt_id = newer.attempt_id
              AND older.question_id = newer.question_id
              AND older.id < newer.id
            """
        )
    )


def upgrade() -> None:
    if _has_table("attempt_answers"):
        _deduplicate_attempt_answers("attempt_answers")
        if not _has_unique_constraint("attempt_answers", "uq_attempt_answers_attempt_question"):
            op.create_unique_constraint(
                "uq_attempt_answers_attempt_question",
                "attempt_answers",
                ["attempt_id", "question_id"],
            )
        if not _has_index("attempt_answers", "ix_attempt_answers_attempt_question"):
            op.create_index(
                "ix_attempt_answers_attempt_question",
                "attempt_answers",
                ["attempt_id", "question_id"],
                unique=False,
            )

    if _has_table("guest_attempt_answers"):
        _deduplicate_attempt_answers("guest_attempt_answers")
        if not _has_unique_constraint(
            "guest_attempt_answers",
            "uq_guest_attempt_answers_attempt_question",
        ):
            op.create_unique_constraint(
                "uq_guest_attempt_answers_attempt_question",
                "guest_attempt_answers",
                ["attempt_id", "question_id"],
            )
        if not _has_index(
            "guest_attempt_answers",
            "ix_guest_attempt_answers_attempt_question",
        ):
            op.create_index(
                "ix_guest_attempt_answers_attempt_question",
                "guest_attempt_answers",
                ["attempt_id", "question_id"],
                unique=False,
            )


def downgrade() -> None:
    if _has_table("guest_attempt_answers"):
        if _has_index("guest_attempt_answers", "ix_guest_attempt_answers_attempt_question"):
            op.drop_index(
                "ix_guest_attempt_answers_attempt_question",
                table_name="guest_attempt_answers",
            )
        if _has_unique_constraint(
            "guest_attempt_answers",
            "uq_guest_attempt_answers_attempt_question",
        ):
            op.drop_constraint(
                "uq_guest_attempt_answers_attempt_question",
                "guest_attempt_answers",
                type_="unique",
            )

    if _has_table("attempt_answers"):
        if _has_index("attempt_answers", "ix_attempt_answers_attempt_question"):
            op.drop_index("ix_attempt_answers_attempt_question", table_name="attempt_answers")
        if _has_unique_constraint("attempt_answers", "uq_attempt_answers_attempt_question"):
            op.drop_constraint(
                "uq_attempt_answers_attempt_question",
                "attempt_answers",
                type_="unique",
            )
