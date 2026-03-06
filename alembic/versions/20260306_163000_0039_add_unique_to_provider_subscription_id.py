"""add unique to provider subscription id

Revision ID: 0039
Revises: 0038
Create Date: 2026-03-06 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0039'
down_revision: Union[str, None] = 'd4f1a7e8b902'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # We will just create the index instead of unique constraint to be safe,
    # or both index and unique constraint as defined in model.
    # The model has index=True, unique=True.
    op.create_index(
        op.f('ix_subscriptions_provider_subscription_id'),
        'subscriptions',
        ['provider_subscription_id'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_subscriptions_provider_subscription_id'),
        table_name='subscriptions'
    )
