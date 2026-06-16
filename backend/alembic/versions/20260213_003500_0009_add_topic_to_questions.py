"""
Add topic field to questions table

Revision ID: 0009
Revises: 0008
Create Date: 2026-02-13 00:35:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0009'
down_revision: Union[str, None] = '0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'questions',
        sa.Column('topic', sa.String(length=100), nullable=True)
    )
    op.create_index(op.f('ix_questions_topic'), 'questions', ['topic'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_questions_topic'), table_name='questions')
    op.drop_column('questions', 'topic')
