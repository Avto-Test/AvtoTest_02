"""add question dynamic fields

Revision ID: 20260213_050000_0015
Revises: 20260213_040000_0014
Create Date: 2026-02-13 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260213_050000_0015'
down_revision = '20260213_040000_0014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('questions', sa.Column('total_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('questions', sa.Column('total_correct', sa.Integer(), server_default='0', nullable=False))
    op.add_column('questions', sa.Column('dynamic_difficulty_score', sa.Float(), server_default='0.5', nullable=False))
    op.create_index('ix_questions_total_attempts', 'questions', ['total_attempts'])


def downgrade() -> None:
    op.drop_index('ix_questions_total_attempts', table_name='questions')
    op.drop_column('questions', 'dynamic_difficulty_score')
    op.drop_column('questions', 'total_correct')
    op.drop_column('questions', 'total_attempts')
