"""
Add full_name field to users table

Revision ID: 0007
Revises: 0006
Create Date: 2026-02-12 19:40:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('full_name', sa.String(length=255), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('users', 'full_name')
