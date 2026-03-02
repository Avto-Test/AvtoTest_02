"""add adaptive fields to attempts

Revision ID: 20260213_020000_0011
Revises: 20260213_013000_0010
Create Date: 2026-02-13 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260213_020000_0011'
down_revision = '20260213_013000_0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('attempts', sa.Column('is_adaptive', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('attempts', sa.Column('training_level', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('attempts', 'training_level')
    op.drop_column('attempts', 'is_adaptive')
