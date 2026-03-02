"""create user_training_history

Revision ID: 20260213_030000_0013
Revises: 20260213_023000_0012
Create Date: 2026-02-13 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260213_030000_0013'
down_revision = '20260213_023000_0012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('user_training_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('previous_level', sa.String(length=20), nullable=True),
        sa.Column('new_level', sa.String(length=20), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('user_training_history')
