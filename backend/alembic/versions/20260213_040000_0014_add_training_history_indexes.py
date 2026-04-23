"""add training history indexes

Revision ID: 20260213_040000_0014
Revises: 20260213_030000_0013
Create Date: 2026-02-13 04:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '20260213_040000_0014'
down_revision = '20260213_030000_0013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_user_training_history_user_id', 'user_training_history', ['user_id'])
    op.create_index('ix_user_training_history_changed_at', 'user_training_history', ['changed_at'])


def downgrade() -> None:
    op.drop_index('ix_user_training_history_changed_at', table_name='user_training_history')
    op.drop_index('ix_user_training_history_user_id', table_name='user_training_history')
