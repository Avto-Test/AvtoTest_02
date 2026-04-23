"""add retention fields to user_skill

Revision ID: 20260213_070000_0018
Revises: 20260213_060000_0017
Create Date: 2026-02-13 07:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260213_070000_0018'
down_revision = '20260213_060000_0017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add last_practice_at and retention_score columns
    op.add_column('user_skills', sa.Column('last_practice_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user_skills', sa.Column('retention_score', sa.Float(), nullable=False, server_default='1.0'))
    
    # Remove server default for retention_score after adding
    op.alter_column('user_skills', 'retention_score', server_default=None)


def downgrade() -> None:
    op.drop_column('user_skills', 'retention_score')
    op.drop_column('user_skills', 'last_practice_at')
