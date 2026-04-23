"""create lessons table for learning content

Revision ID: 9f1b3d2e8a10
Revises: 7b62d3a4d0e8
Create Date: 2026-02-27 21:00:00

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "9f1b3d2e8a10"
down_revision: Union[str, None] = "7b62d3a4d0e8"
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
    if not _has_table("lessons"):
        op.create_table(
            "lessons",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("content_type", sa.String(length=30), nullable=False, server_default="link"),
            sa.Column("content_url", sa.String(length=1000), nullable=False),
            sa.Column("thumbnail_url", sa.String(length=1000), nullable=True),
            sa.Column("topic", sa.String(length=120), nullable=True),
            sa.Column("section", sa.String(length=120), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("lessons", "ix_lessons_is_active"):
        op.create_index("ix_lessons_is_active", "lessons", ["is_active"], unique=False)
    if not _has_index("lessons", "ix_lessons_sort_order"):
        op.create_index("ix_lessons_sort_order", "lessons", ["sort_order"], unique=False)
    if not _has_index("lessons", "ix_lessons_topic"):
        op.create_index("ix_lessons_topic", "lessons", ["topic"], unique=False)
    if not _has_index("lessons", "ix_lessons_section"):
        op.create_index("ix_lessons_section", "lessons", ["section"], unique=False)


def downgrade() -> None:
    if _has_table("lessons"):
        if _has_index("lessons", "ix_lessons_section"):
            op.drop_index("ix_lessons_section", table_name="lessons")
        if _has_index("lessons", "ix_lessons_topic"):
            op.drop_index("ix_lessons_topic", table_name="lessons")
        if _has_index("lessons", "ix_lessons_sort_order"):
            op.drop_index("ix_lessons_sort_order", table_name="lessons")
        if _has_index("lessons", "ix_lessons_is_active"):
            op.drop_index("ix_lessons_is_active", table_name="lessons")
        op.drop_table("lessons")
