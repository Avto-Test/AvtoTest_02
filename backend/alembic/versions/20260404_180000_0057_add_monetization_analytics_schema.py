"""add monetization analytics schema

Revision ID: 0057
Revises: 0056
Create Date: 2026-04-04 18:00:00.000000+00:00

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0057"
down_revision: Union[str, None] = "0056"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if _has_table("analytics_events"):
        if _has_index("analytics_events", "ix_analytics_events_event_name"):
            op.drop_index("ix_analytics_events_event_name", table_name="analytics_events")

        if _has_column("analytics_events", "event_name") and not _has_column("analytics_events", "event_type"):
            op.alter_column("analytics_events", "event_name", new_column_name="event_type")

        if not _has_column("analytics_events", "feature_key"):
            op.add_column("analytics_events", sa.Column("feature_key", sa.String(length=100), nullable=True))

        if not _has_index("analytics_events", "ix_analytics_events_event_type"):
            op.create_index("ix_analytics_events_event_type", "analytics_events", ["event_type"], unique=False)
        if not _has_index("analytics_events", "ix_analytics_events_feature_key"):
            op.create_index("ix_analytics_events_feature_key", "analytics_events", ["feature_key"], unique=False)
        if not _has_index("analytics_events", "ix_analytics_events_event_type_feature_key"):
            op.create_index(
                "ix_analytics_events_event_type_feature_key",
                "analytics_events",
                ["event_type", "feature_key"],
                unique=False,
            )

    if _has_table("features"):
        if not _has_column("features", "experiment_group"):
            op.add_column("features", sa.Column("experiment_group", sa.String(length=100), nullable=True))
        if not _has_column("features", "rollout_percentage"):
            op.add_column(
                "features",
                sa.Column(
                    "rollout_percentage",
                    sa.Integer(),
                    nullable=False,
                    server_default=sa.text("0"),
                ),
            )
        if not _has_column("features", "feature_usage_limit"):
            op.add_column("features", sa.Column("feature_usage_limit", sa.Integer(), nullable=True))

        if not _has_index("features", "ix_features_experiment_group"):
            op.create_index("ix_features_experiment_group", "features", ["experiment_group"], unique=False)

        op.execute(
            sa.text(
                """
                UPDATE features
                SET
                    experiment_group = CASE key
                        WHEN 'analytics_view' THEN 'analytics_unlock_test'
                        WHEN 'ai_prediction' THEN 'ai_prediction_test'
                        WHEN 'simulation_run' THEN 'simulation_unlock_test'
                        ELSE experiment_group
                    END,
                    rollout_percentage = COALESCE(rollout_percentage, 0)
                """
            )
        )


def downgrade() -> None:
    if _has_table("features"):
        if _has_index("features", "ix_features_experiment_group"):
            op.drop_index("ix_features_experiment_group", table_name="features")
        if _has_column("features", "feature_usage_limit"):
            op.drop_column("features", "feature_usage_limit")
        if _has_column("features", "rollout_percentage"):
            op.drop_column("features", "rollout_percentage")
        if _has_column("features", "experiment_group"):
            op.drop_column("features", "experiment_group")

    if _has_table("analytics_events"):
        if _has_index("analytics_events", "ix_analytics_events_event_type_feature_key"):
            op.drop_index("ix_analytics_events_event_type_feature_key", table_name="analytics_events")
        if _has_index("analytics_events", "ix_analytics_events_feature_key"):
            op.drop_index("ix_analytics_events_feature_key", table_name="analytics_events")
        if _has_index("analytics_events", "ix_analytics_events_event_type"):
            op.drop_index("ix_analytics_events_event_type", table_name="analytics_events")
        if _has_column("analytics_events", "feature_key"):
            op.drop_column("analytics_events", "feature_key")
        if _has_column("analytics_events", "event_type") and not _has_column("analytics_events", "event_name"):
            op.alter_column("analytics_events", "event_type", new_column_name="event_name")
        if not _has_index("analytics_events", "ix_analytics_events_event_name") and _has_column("analytics_events", "event_name"):
            op.create_index("ix_analytics_events_event_name", "analytics_events", ["event_name"], unique=False)
