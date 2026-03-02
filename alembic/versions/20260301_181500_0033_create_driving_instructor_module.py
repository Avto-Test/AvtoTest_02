"""create driving instructor module tables

Revision ID: d5b8f0c1a7e4
Revises: a32f0c7e9d11
Create Date: 2026-03-01 18:15:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "d5b8f0c1a7e4"
down_revision: Union[str, None] = "a32f0c7e9d11"
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
    if not _has_table("driving_instructors"):
        op.create_table(
            "driving_instructors",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("slug", sa.String(length=140), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("gender", sa.String(length=20), nullable=True),
            sa.Column("years_experience", sa.Integer(), server_default="0", nullable=False),
            sa.Column("short_bio", sa.String(length=1200), nullable=False),
            sa.Column("teaching_style", sa.Text(), nullable=True),
            sa.Column("city", sa.String(length=120), nullable=False),
            sa.Column("region", sa.String(length=120), nullable=True),
            sa.Column("service_areas", sa.Text(), nullable=True),
            sa.Column("transmission", sa.String(length=20), nullable=False),
            sa.Column("car_model", sa.String(length=120), nullable=False),
            sa.Column("car_year", sa.Integer(), nullable=True),
            sa.Column("car_features", sa.Text(), nullable=True),
            sa.Column("hourly_price_cents", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(length=10), server_default="UZS", nullable=False),
            sa.Column("min_lesson_minutes", sa.Integer(), server_default="60", nullable=False),
            sa.Column("special_services", sa.Text(), nullable=True),
            sa.Column("phone", sa.String(length=40), nullable=False),
            sa.Column("telegram", sa.String(length=120), nullable=True),
            sa.Column("profile_image_url", sa.String(length=2000), nullable=False),
            sa.Column("map_embed_url", sa.String(length=2000), nullable=True),
            sa.Column("referral_code", sa.String(length=80), nullable=False),
            sa.Column("promo_code_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("is_verified", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("is_blocked", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("is_top_rated", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["promo_code_id"], ["promo_codes.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("promo_code_id", name="uq_driving_instructors_promo_code_id"),
            sa.UniqueConstraint("referral_code", name="uq_driving_instructors_referral_code"),
            sa.UniqueConstraint("slug", name="uq_driving_instructors_slug"),
            sa.UniqueConstraint("user_id", name="uq_driving_instructors_user_id"),
        )

    if not _has_index("driving_instructors", "ix_driving_instructors_city"):
        op.create_index("ix_driving_instructors_city", "driving_instructors", ["city"], unique=False)
    if not _has_index("driving_instructors", "ix_driving_instructors_full_name"):
        op.create_index("ix_driving_instructors_full_name", "driving_instructors", ["full_name"], unique=False)
    if not _has_index("driving_instructors", "ix_driving_instructors_gender"):
        op.create_index("ix_driving_instructors_gender", "driving_instructors", ["gender"], unique=False)
    if not _has_index("driving_instructors", "ix_driving_instructors_hourly_price_cents"):
        op.create_index("ix_driving_instructors_hourly_price_cents", "driving_instructors", ["hourly_price_cents"], unique=False)
    if not _has_index("driving_instructors", "ix_driving_instructors_is_active"):
        op.create_index("ix_driving_instructors_is_active", "driving_instructors", ["is_active"], unique=False)
    if not _has_index("driving_instructors", "ix_driving_instructors_is_verified"):
        op.create_index("ix_driving_instructors_is_verified", "driving_instructors", ["is_verified"], unique=False)
    if not _has_index("driving_instructors", "ix_driving_instructors_referral_code"):
        op.create_index("ix_driving_instructors_referral_code", "driving_instructors", ["referral_code"], unique=True)
    if not _has_index("driving_instructors", "ix_driving_instructors_slug"):
        op.create_index("ix_driving_instructors_slug", "driving_instructors", ["slug"], unique=True)
    if not _has_index("driving_instructors", "ix_driving_instructors_transmission"):
        op.create_index("ix_driving_instructors_transmission", "driving_instructors", ["transmission"], unique=False)
    if not _has_index("driving_instructors", "ix_driving_instructors_years_experience"):
        op.create_index("ix_driving_instructors_years_experience", "driving_instructors", ["years_experience"], unique=False)

    if not _has_table("driving_instructor_media"):
        op.create_table(
            "driving_instructor_media",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("media_type", sa.String(length=20), server_default="image", nullable=False),
            sa.Column("url", sa.String(length=2000), nullable=False),
            sa.Column("caption", sa.String(length=255), nullable=True),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["instructor_id"], ["driving_instructors.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("driving_instructor_media", "ix_driving_instructor_media_instructor_id"):
        op.create_index("ix_driving_instructor_media_instructor_id", "driving_instructor_media", ["instructor_id"], unique=False)

    if not _has_table("driving_instructor_reviews"):
        op.create_table(
            "driving_instructor_reviews",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("is_visible", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_driving_instructor_reviews_rating_range"),
            sa.ForeignKeyConstraint(["instructor_id"], ["driving_instructors.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("instructor_id", "user_id", name="uq_driving_instructor_reviews_instructor_user"),
        )
    if not _has_index("driving_instructor_reviews", "ix_driving_instructor_reviews_instructor_id"):
        op.create_index("ix_driving_instructor_reviews_instructor_id", "driving_instructor_reviews", ["instructor_id"], unique=False)
    if not _has_index("driving_instructor_reviews", "ix_driving_instructor_reviews_user_id"):
        op.create_index("ix_driving_instructor_reviews_user_id", "driving_instructor_reviews", ["user_id"], unique=False)

    if not _has_table("driving_instructor_leads"):
        op.create_table(
            "driving_instructor_leads",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("phone", sa.String(length=40), nullable=False),
            sa.Column("requested_transmission", sa.String(length=20), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("source", sa.String(length=50), server_default="web", nullable=False),
            sa.Column("status", sa.String(length=30), server_default="new", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["instructor_id"], ["driving_instructors.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("driving_instructor_leads", "ix_driving_instructor_leads_instructor_id"):
        op.create_index("ix_driving_instructor_leads_instructor_id", "driving_instructor_leads", ["instructor_id"], unique=False)
    if not _has_index("driving_instructor_leads", "ix_driving_instructor_leads_status"):
        op.create_index("ix_driving_instructor_leads_status", "driving_instructor_leads", ["status"], unique=False)
    if not _has_index("driving_instructor_leads", "ix_driving_instructor_leads_created_at"):
        op.create_index("ix_driving_instructor_leads_created_at", "driving_instructor_leads", ["created_at"], unique=False)

    if not _has_table("driving_instructor_applications"):
        op.create_table(
            "driving_instructor_applications",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("phone", sa.String(length=40), nullable=False),
            sa.Column("city", sa.String(length=120), nullable=False),
            sa.Column("region", sa.String(length=120), nullable=True),
            sa.Column("gender", sa.String(length=20), nullable=True),
            sa.Column("years_experience", sa.Integer(), server_default="0", nullable=False),
            sa.Column("transmission", sa.String(length=20), nullable=False),
            sa.Column("car_model", sa.String(length=120), nullable=False),
            sa.Column("hourly_price_cents", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(length=10), server_default="UZS", nullable=False),
            sa.Column("short_bio", sa.Text(), nullable=False),
            sa.Column("profile_image_url", sa.String(length=2000), nullable=False),
            sa.Column("extra_images_json", sa.Text(), server_default="[]", nullable=False),
            sa.Column("status", sa.String(length=30), server_default="pending", nullable=False),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("reviewed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("submitted_from", sa.String(length=40), server_default="web", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("driving_instructor_applications", "ix_driving_instructor_applications_city"):
        op.create_index("ix_driving_instructor_applications_city", "driving_instructor_applications", ["city"], unique=False)
    if not _has_index("driving_instructor_applications", "ix_driving_instructor_applications_created_at"):
        op.create_index("ix_driving_instructor_applications_created_at", "driving_instructor_applications", ["created_at"], unique=False)
    if not _has_index("driving_instructor_applications", "ix_driving_instructor_applications_status"):
        op.create_index("ix_driving_instructor_applications_status", "driving_instructor_applications", ["status"], unique=False)
    if not _has_index("driving_instructor_applications", "ix_driving_instructor_applications_user_id"):
        op.create_index("ix_driving_instructor_applications_user_id", "driving_instructor_applications", ["user_id"], unique=False)

    if not _has_table("driving_instructor_registration_settings"):
        op.create_table(
            "driving_instructor_registration_settings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("is_paid_enabled", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("price_cents", sa.Integer(), server_default="0", nullable=False),
            sa.Column("currency", sa.String(length=10), server_default="UZS", nullable=False),
            sa.Column("validity_days", sa.Integer(), server_default="30", nullable=False),
            sa.Column("discount_percent", sa.Integer(), server_default="0", nullable=False),
            sa.Column("campaign_title", sa.String(length=255), nullable=True),
            sa.Column("campaign_description", sa.Text(), nullable=True),
            sa.Column("free_banner_enabled", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("countdown_enabled", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("countdown_ends_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.execute(
            """
            INSERT INTO driving_instructor_registration_settings (id, is_paid_enabled, price_cents, currency, validity_days, discount_percent, free_banner_enabled, countdown_enabled)
            VALUES (1, false, 0, 'UZS', 30, 0, true, false)
            ON CONFLICT (id) DO NOTHING
            """
        )

    if not _has_table("driving_instructor_complaints"):
        op.create_table(
            "driving_instructor_complaints",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("phone", sa.String(length=40), nullable=True),
            sa.Column("reason", sa.String(length=120), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), server_default="new", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["instructor_id"], ["driving_instructors.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("driving_instructor_complaints", "ix_driving_instructor_complaints_instructor_id"):
        op.create_index("ix_driving_instructor_complaints_instructor_id", "driving_instructor_complaints", ["instructor_id"], unique=False)
    if not _has_index("driving_instructor_complaints", "ix_driving_instructor_complaints_status"):
        op.create_index("ix_driving_instructor_complaints_status", "driving_instructor_complaints", ["status"], unique=False)
    if not _has_index("driving_instructor_complaints", "ix_driving_instructor_complaints_created_at"):
        op.create_index("ix_driving_instructor_complaints_created_at", "driving_instructor_complaints", ["created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "driving_instructor_complaints" in tables:
        op.drop_table("driving_instructor_complaints")
    if "driving_instructor_registration_settings" in tables:
        op.drop_table("driving_instructor_registration_settings")
    if "driving_instructor_applications" in tables:
        op.drop_table("driving_instructor_applications")
    if "driving_instructor_leads" in tables:
        op.drop_table("driving_instructor_leads")
    if "driving_instructor_reviews" in tables:
        op.drop_table("driving_instructor_reviews")
    if "driving_instructor_media" in tables:
        op.drop_table("driving_instructor_media")
    if "driving_instructors" in tables:
        op.drop_table("driving_instructors")

