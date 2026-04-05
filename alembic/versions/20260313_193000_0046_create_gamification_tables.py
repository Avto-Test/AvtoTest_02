"""create gamification tables

Revision ID: 0046
Revises: 0045
Create Date: 2026-03-13 19:30:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0046"
down_revision: Union[str, None] = "0045"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_table("xp_wallets"):
        op.create_table(
            "xp_wallets",
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )

    if not _has_table("xp_events"):
        op.create_table(
            "xp_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("source", sa.String(length=120), nullable=False),
            sa.Column("xp_amount", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("user_id", "source", name="uq_xp_events_user_source"),
        )

    if not _has_index("xp_events", "ix_xp_events_user_created_at"):
        op.create_index("ix_xp_events_user_created_at", "xp_events", ["user_id", "created_at"], unique=False)

    if not _has_table("coin_wallets"):
        op.create_table(
            "coin_wallets",
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )

    if not _has_table("coin_transactions"):
        op.create_table(
            "coin_transactions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("type", sa.String(length=24), nullable=False, server_default="credit"),
            sa.Column("source", sa.String(length=120), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("user_id", "type", "source", name="uq_coin_transactions_user_type_source"),
        )

    if not _has_index("coin_transactions", "ix_coin_transactions_user_created_at"):
        op.create_index("ix_coin_transactions_user_created_at", "coin_transactions", ["user_id", "created_at"], unique=False)

    if not _has_table("achievement_definitions"):
        op.create_table(
            "achievement_definitions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=False),
            sa.Column("icon", sa.String(length=64), nullable=False, server_default="sparkles"),
            sa.Column("trigger_rule", sa.String(length=120), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("name"),
            sa.UniqueConstraint("trigger_rule"),
        )

    if not _has_table("user_achievements"):
        op.create_table(
            "user_achievements",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column(
                "achievement_definition_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("achievement_definitions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("awarded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("user_id", "achievement_definition_id", name="uq_user_achievement_definition"),
        )

    if not _has_index("user_achievements", "ix_user_achievements_user_awarded"):
        op.create_index("ix_user_achievements_user_awarded", "user_achievements", ["user_id", "awarded_at"], unique=False)

    if not _has_table("user_streaks"):
        op.create_table(
            "user_streaks",
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_activity_date", sa.Date(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )

    if not _has_table("leaderboard_snapshots"):
        op.create_table(
            "leaderboard_snapshots",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("xp", sa.Integer(), nullable=False),
            sa.Column("period", sa.String(length=16), nullable=False),
            sa.Column("rank", sa.Integer(), nullable=False),
            sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )

    if not _has_index("leaderboard_snapshots", "ix_leaderboard_snapshots_period_rank"):
        op.create_index("ix_leaderboard_snapshots_period_rank", "leaderboard_snapshots", ["period", "rank"], unique=False)
    if not _has_index("leaderboard_snapshots", "ix_leaderboard_snapshots_period_user"):
        op.create_index("ix_leaderboard_snapshots_period_user", "leaderboard_snapshots", ["period", "user_id"], unique=False)


def downgrade() -> None:
    if _has_index("leaderboard_snapshots", "ix_leaderboard_snapshots_period_user"):
        op.drop_index("ix_leaderboard_snapshots_period_user", table_name="leaderboard_snapshots")
    if _has_index("leaderboard_snapshots", "ix_leaderboard_snapshots_period_rank"):
        op.drop_index("ix_leaderboard_snapshots_period_rank", table_name="leaderboard_snapshots")
    if _has_table("leaderboard_snapshots"):
        op.drop_table("leaderboard_snapshots")

    if _has_table("user_streaks"):
        op.drop_table("user_streaks")

    if _has_index("user_achievements", "ix_user_achievements_user_awarded"):
        op.drop_index("ix_user_achievements_user_awarded", table_name="user_achievements")
    if _has_table("user_achievements"):
        op.drop_table("user_achievements")

    if _has_table("achievement_definitions"):
        op.drop_table("achievement_definitions")

    if _has_index("coin_transactions", "ix_coin_transactions_user_created_at"):
        op.drop_index("ix_coin_transactions_user_created_at", table_name="coin_transactions")
    if _has_table("coin_transactions"):
        op.drop_table("coin_transactions")

    if _has_table("coin_wallets"):
        op.drop_table("coin_wallets")

    if _has_index("xp_events", "ix_xp_events_user_created_at"):
        op.drop_index("ix_xp_events_user_created_at", table_name="xp_events")
    if _has_table("xp_events"):
        op.drop_table("xp_events")

    if _has_table("xp_wallets"):
        op.drop_table("xp_wallets")
