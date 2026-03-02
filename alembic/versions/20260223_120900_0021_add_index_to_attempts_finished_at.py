"""Add index to attempts.finished_at

Revision ID: 0021
Revises: 1c63318e438c
Create Date: 2026-02-23 12:09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0021"
down_revision: Union[str, None] = "1c63318e438c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        op.f("ix_attempts_finished_at"),
        "attempts",
        ["finished_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_attempts_finished_at"), table_name="attempts")
