"""add bkt fields to user_skill

Revision ID: 20260213_060000_0017
Revises: 20260213_053000_0016
Create Date: 2026-02-13 06:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260213_060000_0017'
down_revision = '20260213_053000_0016'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add bkt_knowledge_prob and bkt_attempts columns to user_skills table
    op.add_column('user_skills', sa.Column('bkt_knowledge_prob', sa.Float(), nullable=False, server_default='0.3'))
    op.add_column('user_skills', sa.Column('bkt_attempts', sa.Integer(), nullable=False, server_default='0'))
    
    # Remove server defaults after adding
    op.alter_column('user_skills', 'bkt_knowledge_prob', server_default=None)
    op.alter_column('user_skills', 'bkt_attempts', server_default=None)


def downgrade() -> None:
    op.drop_column('user_skills', 'bkt_attempts')
    op.drop_column('user_skills', 'bkt_knowledge_prob')
