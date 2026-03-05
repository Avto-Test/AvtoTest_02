"""add verification token type and mark existing users verified

Revision ID: b7d9e2f5c311
Revises: f4c8d1b27a9e
Create Date: 2026-03-05 11:35:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7d9e2f5c311"
down_revision: Union[str, None] = "f4c8d1b27a9e"
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
    if _has_table("verification_tokens") and not _has_column("verification_tokens", "token_type"):
        op.add_column(
            "verification_tokens",
            sa.Column("token_type", sa.String(length=32), server_default="email_verification", nullable=True),
        )
        op.execute(
            sa.text(
                "UPDATE verification_tokens SET token_type = 'email_verification' WHERE token_type IS NULL"
            )
        )
        op.alter_column("verification_tokens", "token_type", nullable=False)

    if _has_table("users") and _has_column("users", "is_verified"):
        op.execute(sa.text("UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE"))


def downgrade() -> None:
    if _has_table("verification_tokens") and _has_column("verification_tokens", "token_type"):
        op.drop_column("verification_tokens", "token_type")
