"""create driving school module tables

Revision ID: a32f0c7e9d11
Revises: f91d7ab82e31
Create Date: 2026-03-01 14:00:00

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a32f0c7e9d11"
down_revision: Union[str, None] = "f91d7ab82e31"
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
    if not _has_table("driving_schools"):
        op.create_table(
            "driving_schools",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("slug", sa.String(length=140), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("short_description", sa.String(length=500), nullable=True),
            sa.Column("full_description", sa.Text(), nullable=True),
            sa.Column("city", sa.String(length=120), nullable=False),
            sa.Column("region", sa.String(length=120), nullable=True),
            sa.Column("address", sa.String(length=500), nullable=True),
            sa.Column("landmark", sa.String(length=255), nullable=True),
            sa.Column("phone", sa.String(length=40), nullable=False),
            sa.Column("telegram", sa.String(length=120), nullable=True),
            sa.Column("website", sa.String(length=255), nullable=True),
            sa.Column("work_hours", sa.String(length=255), nullable=True),
            sa.Column("license_info", sa.String(length=255), nullable=True),
            sa.Column("years_active", sa.Integer(), nullable=True),
            sa.Column("logo_url", sa.String(length=1000), nullable=True),
            sa.Column("map_embed_url", sa.String(length=2000), nullable=True),
            sa.Column("referral_code", sa.String(length=80), nullable=False),
            sa.Column("promo_code_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["promo_code_id"], ["promo_codes.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("promo_code_id", name="uq_driving_schools_promo_code_id"),
            sa.UniqueConstraint("referral_code", name="uq_driving_schools_referral_code"),
            sa.UniqueConstraint("slug", name="uq_driving_schools_slug"),
        )

    if not _has_index("driving_schools", "ix_driving_schools_city"):
        op.create_index("ix_driving_schools_city", "driving_schools", ["city"], unique=False)
    if not _has_index("driving_schools", "ix_driving_schools_is_active"):
        op.create_index("ix_driving_schools_is_active", "driving_schools", ["is_active"], unique=False)
    if not _has_index("driving_schools", "ix_driving_schools_name"):
        op.create_index("ix_driving_schools_name", "driving_schools", ["name"], unique=False)
    if not _has_index("driving_schools", "ix_driving_schools_referral_code"):
        op.create_index("ix_driving_schools_referral_code", "driving_schools", ["referral_code"], unique=True)
    if not _has_index("driving_schools", "ix_driving_schools_slug"):
        op.create_index("ix_driving_schools_slug", "driving_schools", ["slug"], unique=True)

    if not _has_table("driving_school_courses"):
        op.create_table(
            "driving_school_courses",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("category_code", sa.String(length=20), nullable=False),
            sa.Column("duration_weeks", sa.Integer(), nullable=True),
            sa.Column("price_cents", sa.Integer(), nullable=True),
            sa.Column("currency", sa.String(length=10), server_default="UZS", nullable=False),
            sa.Column("installment_available", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["school_id"], ["driving_schools.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("driving_school_courses", "ix_driving_school_courses_school_id"):
        op.create_index("ix_driving_school_courses_school_id", "driving_school_courses", ["school_id"], unique=False)
    if not _has_index("driving_school_courses", "ix_driving_school_courses_category_code"):
        op.create_index("ix_driving_school_courses_category_code", "driving_school_courses", ["category_code"], unique=False)
    if not _has_index("driving_school_courses", "ix_driving_school_courses_price_cents"):
        op.create_index("ix_driving_school_courses_price_cents", "driving_school_courses", ["price_cents"], unique=False)

    if not _has_table("driving_school_media"):
        op.create_table(
            "driving_school_media",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("media_type", sa.String(length=20), server_default="image", nullable=False),
            sa.Column("url", sa.String(length=2000), nullable=False),
            sa.Column("caption", sa.String(length=255), nullable=True),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["school_id"], ["driving_schools.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("driving_school_media", "ix_driving_school_media_school_id"):
        op.create_index("ix_driving_school_media_school_id", "driving_school_media", ["school_id"], unique=False)

    if not _has_table("driving_school_reviews"):
        op.create_table(
            "driving_school_reviews",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("is_visible", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_driving_school_reviews_rating_range"),
            sa.ForeignKeyConstraint(["school_id"], ["driving_schools.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("school_id", "user_id", name="uq_driving_school_reviews_school_user"),
        )

    if not _has_index("driving_school_reviews", "ix_driving_school_reviews_school_id"):
        op.create_index("ix_driving_school_reviews_school_id", "driving_school_reviews", ["school_id"], unique=False)
    if not _has_index("driving_school_reviews", "ix_driving_school_reviews_user_id"):
        op.create_index("ix_driving_school_reviews_user_id", "driving_school_reviews", ["user_id"], unique=False)

    if not _has_table("driving_school_leads"):
        op.create_table(
            "driving_school_leads",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("phone", sa.String(length=40), nullable=False),
            sa.Column("requested_category", sa.String(length=30), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("source", sa.String(length=50), server_default="web", nullable=False),
            sa.Column("status", sa.String(length=30), server_default="new", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["school_id"], ["driving_schools.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("driving_school_leads", "ix_driving_school_leads_school_id"):
        op.create_index("ix_driving_school_leads_school_id", "driving_school_leads", ["school_id"], unique=False)
    if not _has_index("driving_school_leads", "ix_driving_school_leads_status"):
        op.create_index("ix_driving_school_leads_status", "driving_school_leads", ["status"], unique=False)
    if not _has_index("driving_school_leads", "ix_driving_school_leads_created_at"):
        op.create_index("ix_driving_school_leads_created_at", "driving_school_leads", ["created_at"], unique=False)

    if not _has_table("driving_school_partner_applications"):
        op.create_table(
            "driving_school_partner_applications",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("school_name", sa.String(length=255), nullable=False),
            sa.Column("city", sa.String(length=120), nullable=False),
            sa.Column("responsible_person", sa.String(length=255), nullable=False),
            sa.Column("phone", sa.String(length=40), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), server_default="new", nullable=False),
            sa.Column("reviewed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_index("driving_school_partner_applications", "ix_driving_school_partner_applications_city"):
        op.create_index(
            "ix_driving_school_partner_applications_city",
            "driving_school_partner_applications",
            ["city"],
            unique=False,
        )
    if not _has_index("driving_school_partner_applications", "ix_driving_school_partner_applications_email"):
        op.create_index(
            "ix_driving_school_partner_applications_email",
            "driving_school_partner_applications",
            ["email"],
            unique=False,
        )
    if not _has_index("driving_school_partner_applications", "ix_driving_school_partner_applications_status"):
        op.create_index(
            "ix_driving_school_partner_applications_status",
            "driving_school_partner_applications",
            ["status"],
            unique=False,
        )
    if not _has_index("driving_school_partner_applications", "ix_driving_school_partner_applications_created_at"):
        op.create_index(
            "ix_driving_school_partner_applications_created_at",
            "driving_school_partner_applications",
            ["created_at"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "driving_school_partner_applications" in tables:
        op.drop_table("driving_school_partner_applications")
    if "driving_school_leads" in tables:
        op.drop_table("driving_school_leads")
    if "driving_school_reviews" in tables:
        op.drop_table("driving_school_reviews")
    if "driving_school_media" in tables:
        op.drop_table("driving_school_media")
    if "driving_school_courses" in tables:
        op.drop_table("driving_school_courses")
    if "driving_schools" in tables:
        op.drop_table("driving_schools")
