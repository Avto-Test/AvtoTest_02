"""create pending registrations table

Revision ID: c1a3f1b2d9aa
Revises: b7d9e2f5c311
Create Date: 2026-03-05 18:45:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c1a3f1b2d9aa"
down_revision: Union[str, None] = "b7d9e2f5c311"
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


def upgrade() -> None:
    if not _has_table("pending_registrations"):
        op.create_table(
            "pending_registrations",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("code", sa.String(length=6), nullable=False),
            sa.Column("code_expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("email", name="uq_pending_registrations_email"),
        )
        op.create_index(
            "ix_pending_registrations_email",
            "pending_registrations",
            ["email"],
            unique=False,
        )

    # Safety requirement: mark all already registered users as verified.
    if _has_table("users") and _has_column("users", "is_verified"):
        op.execute(sa.text("UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE"))


def downgrade() -> None:
    if _has_table("pending_registrations"):
        op.drop_index("ix_pending_registrations_email", table_name="pending_registrations")
        op.drop_table("pending_registrations")
