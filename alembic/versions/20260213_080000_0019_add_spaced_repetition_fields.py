"""add spaced repetition fields to user_skill

Revision ID: 20260213_080000_0019
Revises: 20260213_070000_0018
Create Date: 2026-02-13 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision = '20260213_080000_0019'
down_revision = '20260213_070000_0018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add fields safely
    op.add_column('user_skills', sa.Column('repetition_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_skills', sa.Column('interval_days', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_skills', sa.Column('ease_factor', sa.Float(), nullable=False, server_default='2.5'))
    op.add_column('user_skills', sa.Column('next_review_at', sa.DateTime(timezone=True), nullable=True))
    
    # Backfill next_review_at with current time (UTC)
    now = datetime.now(timezone.utc)
    op.execute(f"UPDATE user_skills SET next_review_at = '{now.isoformat()}' WHERE next_review_at IS NULL")
    
    # Add index on next_review_at
    op.create_index(op.f('ix_user_skills_next_review_at'), 'user_skills', ['next_review_at'], unique=False)
    
    # Remove server defaults after backfill
    op.alter_column('user_skills', 'repetition_count', server_default=None)
    op.alter_column('user_skills', 'interval_days', server_default=None)
    op.alter_column('user_skills', 'ease_factor', server_default=None)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_skills_next_review_at'), table_name='user_skills')
    op.drop_column('user_skills', 'next_review_at')
    op.drop_column('user_skills', 'ease_factor')
    op.drop_column('user_skills', 'interval_days')
    op.drop_column('user_skills', 'repetition_count')
