"""add difficulty to questions

Revision ID: 20260213_013000_0010
Revises: 20260213_003500_0009
Create Date: 2026-02-13 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260213_013000_0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('questions', sa.Column('difficulty', sa.String(length=20), nullable=False, server_default='medium'))
    op.create_index(op.f('ix_questions_difficulty'), 'questions', ['difficulty'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_questions_difficulty'), table_name='questions')
    op.drop_column('questions', 'difficulty')
