"""create feedbacks table

Revision ID: b4c16de23a77
Revises: 9f1b3d2e8a10
Create Date: 2026-02-27 22:00:00

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b4c16de23a77"
down_revision: Union[str, None] = "9f1b3d2e8a10"
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
    if not _has_table("feedbacks"):
        op.create_table(
            "feedbacks",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("category", sa.String(length=50), nullable=False, server_default="general"),
            sa.Column("comment", sa.Text(), nullable=False),
            sa.Column("suggestion", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="new"),
            sa.Column("admin_note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("feedbacks", "ix_feedbacks_user_id"):
        op.create_index("ix_feedbacks_user_id", "feedbacks", ["user_id"], unique=False)
    if not _has_index("feedbacks", "ix_feedbacks_status"):
        op.create_index("ix_feedbacks_status", "feedbacks", ["status"], unique=False)
    if not _has_index("feedbacks", "ix_feedbacks_created_at"):
        op.create_index("ix_feedbacks_created_at", "feedbacks", ["created_at"], unique=False)


def downgrade() -> None:
    if _has_table("feedbacks"):
        if _has_index("feedbacks", "ix_feedbacks_created_at"):
            op.drop_index("ix_feedbacks_created_at", table_name="feedbacks")
        if _has_index("feedbacks", "ix_feedbacks_status"):
            op.drop_index("ix_feedbacks_status", table_name="feedbacks")
        if _has_index("feedbacks", "ix_feedbacks_user_id"):
            op.drop_index("ix_feedbacks_user_id", table_name="feedbacks")
        op.drop_table("feedbacks")
