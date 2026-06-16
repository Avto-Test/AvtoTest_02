"""Add question media and category fields

Revision ID: 0025
Revises: 0024
Create Date: 2026-02-25 23:15:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_column("questions", "video_url"):
        op.add_column("questions", sa.Column("video_url", sa.String(length=500), nullable=True))
    if not _has_column("questions", "media_type"):
        op.add_column(
            "questions",
            sa.Column("media_type", sa.String(length=20), nullable=False, server_default="text"),
        )
    if not _has_column("questions", "category"):
        op.add_column("questions", sa.Column("category", sa.String(length=100), nullable=True))

    if not _has_index("questions", "ix_questions_media_type"):
        op.create_index("ix_questions_media_type", "questions", ["media_type"], unique=False)
    if not _has_index("questions", "ix_questions_category"):
        op.create_index("ix_questions_category", "questions", ["category"], unique=False)


def downgrade() -> None:
    if _has_index("questions", "ix_questions_category"):
        op.drop_index("ix_questions_category", table_name="questions")
    if _has_index("questions", "ix_questions_media_type"):
        op.drop_index("ix_questions_media_type", table_name="questions")

    for column in ("category", "media_type", "video_url"):
        if _has_column("questions", column):
            op.drop_column("questions", column)
