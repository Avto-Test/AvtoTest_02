"""add tests duration

Revision ID: 1794ea880ddf
Revises: 0027
Create Date: 2026-02-26 00:07:10.316640+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1794ea880ddf'
down_revision: Union[str, None] = '0027'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tests", sa.Column("duration", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("tests", "duration")
