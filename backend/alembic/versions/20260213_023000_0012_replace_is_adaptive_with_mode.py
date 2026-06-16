"""replace is_adaptive with mode

Revision ID: 20260213_023000_0012
Revises: 20260213_020000_0011
Create Date: 2026-02-13 02:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260213_023000_0012'
down_revision = '20260213_020000_0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add mode column (default 'standard')
    op.add_column('attempts', sa.Column('mode', sa.String(length=20), server_default='standard', nullable=False))
    
    # 2. Migrate data
    # Update attempts where is_adaptive is true to have mode='adaptive'
    op.execute("UPDATE attempts SET mode = 'adaptive' WHERE is_adaptive = true")
    
    # 3. Drop is_adaptive column
    op.drop_column('attempts', 'is_adaptive')


def downgrade() -> None:
    # 1. Add is_adaptive column (default false)
    op.add_column('attempts', sa.Column('is_adaptive', sa.Boolean(), server_default='false', nullable=False))
    
    # 2. Migrate data
    # Update attempts where mode is 'adaptive' to have is_adaptive=true
    op.execute("UPDATE attempts SET is_adaptive = true WHERE mode = 'adaptive'")
    
    # 3. Drop mode column
    op.drop_column('attempts', 'mode')
