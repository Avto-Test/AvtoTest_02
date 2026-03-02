"""add user skill model

Revision ID: 20260213_053000_0016
Revises: 20260213_050000_0015
Create Date: 2026-02-13 05:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260213_053000_0016'
down_revision = '20260213_050000_0015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_skills table
    op.create_table('user_skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('topic', sa.String(length=100), nullable=False),
        sa.Column('skill_score', sa.Float(), nullable=False),
        sa.Column('total_attempts', sa.Integer(), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'topic', name='uq_user_topic_skill')
    )
    op.create_index(op.f('ix_user_skills_topic'), 'user_skills', ['topic'], unique=False)
    op.create_index(op.f('ix_user_skills_user_id'), 'user_skills', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_skills_user_id'), table_name='user_skills')
    op.drop_index(op.f('ix_user_skills_topic'), table_name='user_skills')
    op.drop_table('user_skills')
