"""add cognitive fields to attempts

Revision ID: 20260213_090000_0020
Revises: 20260213_080000_0019
Create Date: 2026-02-13 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260213_090000_0020'
down_revision = '20260213_080000_0019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add fields
    op.add_column('attempts', sa.Column('avg_response_time', sa.Float(), nullable=True))
    op.add_column('attempts', sa.Column('response_time_variance', sa.Float(), nullable=True))
    op.add_column('attempts', sa.Column('pressure_mode', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('attempts', sa.Column('pressure_score_modifier', sa.Float(), nullable=False, server_default='1.0'))
    
    # Add index on pressure_mode
    op.create_index(op.f('ix_attempts_pressure_mode'), 'attempts', ['pressure_mode'], unique=False)
    
    # Remove server defaults after backfill (server_default was used for backfill in add_column)
    op.alter_column('attempts', 'pressure_mode', server_default=None)
    op.alter_column('attempts', 'pressure_score_modifier', server_default=None)


def downgrade() -> None:
    op.drop_index(op.f('ix_attempts_pressure_mode'), table_name='attempts')
    op.drop_column('attempts', 'pressure_score_modifier')
    op.drop_column('attempts', 'pressure_mode')
    op.drop_column('attempts', 'response_time_variance')
    op.drop_column('attempts', 'avg_response_time')
