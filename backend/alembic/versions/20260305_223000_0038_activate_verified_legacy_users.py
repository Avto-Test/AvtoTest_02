"""activate and verify legacy users for mandatory email-verification flow

Revision ID: d4f1a7e8b902
Revises: c1a3f1b2d9aa
Create Date: 2026-03-05 22:30:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4f1a7e8b902"
down_revision: Union[str, None] = "c1a3f1b2d9aa"
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
    if _has_table("users") and _has_column("users", "is_verified"):
        op.execute(sa.text("UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE"))

    # Legacy safety:
    # earlier flows could leave users verified but inactive, causing 403 on login.
    if (
        _has_table("users")
        and _has_column("users", "is_verified")
        and _has_column("users", "is_active")
    ):
        op.execute(
            sa.text(
                "UPDATE users SET is_active = TRUE "
                "WHERE is_verified = TRUE AND is_active = FALSE"
            )
        )


def downgrade() -> None:
    # Data-only fix; no destructive rollback.
    pass
