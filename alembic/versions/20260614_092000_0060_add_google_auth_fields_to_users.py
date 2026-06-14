"""add google auth fields to users

Revision ID: 0060
Revises: 0059
Create Date: 2026-06-14 09:20:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0060"
down_revision: Union[str, None] = "0059"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30)")
    op.execute("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ck_users_auth_provider_values'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT ck_users_auth_provider_values
                CHECK (auth_provider IS NULL OR auth_provider IN ('local', 'google'));
            END IF;
        END $$;
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id "
        "ON users (google_id) WHERE google_id IS NOT NULL"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_users_auth_provider "
        "ON users (auth_provider)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_auth_provider")
    op.execute("DROP INDEX IF EXISTS ix_users_google_id")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_auth_provider_values")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS auth_provider")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_id")
