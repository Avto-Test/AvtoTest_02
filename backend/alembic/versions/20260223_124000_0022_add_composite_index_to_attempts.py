"""Add composite index to attempts

Revision ID: 0022
Revises: 0021
Create Date: 2026-02-23 12:40:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_attempts_user_finished",
        "attempts",
        ["user_id", sa.text("finished_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_attempts_user_finished", table_name="attempts")
