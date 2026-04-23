"""normalize marketplace statuses and enforce constraints

Revision ID: 0053
Revises: 0052
Create Date: 2026-03-25 03:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0053"
down_revision: Union[str, None] = "0052"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SCHOOL_LEAD_ALIASES = {
    "NEW": "NEW",
    "PENDING": "NEW",
    "CONTACTED": "CONTACTED",
    "QUALIFIED": "CONTACTED",
    "ENROLLED": "ENROLLED",
    "CLOSED": "ENROLLED",
    "REJECTED": "REJECTED",
    "DECLINED": "REJECTED",
}

SCHOOL_APPLICATION_ALIASES = {
    "NEW": "PENDING",
    "PENDING": "PENDING",
    "WAITING": "PENDING",
    "SUBMITTED": "PENDING",
    "REVIEW": "PENDING",
    "REVIEWING": "PENDING",
    "IN_REVIEW": "PENDING",
    "UNDER_REVIEW": "PENDING",
    "APPROVED": "APPROVED",
    "ACCEPTED": "APPROVED",
    "VERIFIED": "APPROVED",
    "REJECTED": "REJECTED",
    "DECLINED": "REJECTED",
    "DENIED": "REJECTED",
}

INSTRUCTOR_LEAD_ALIASES = {
    "NEW": "NEW",
    "PENDING": "NEW",
    "CONTACTED": "CONTACTED",
    "QUALIFIED": "CONTACTED",
    "BOOKED": "BOOKED",
    "CLOSED": "BOOKED",
    "REJECTED": "REJECTED",
    "DECLINED": "REJECTED",
}

INSTRUCTOR_APPLICATION_ALIASES = {
    "NEW": "PENDING",
    "PENDING": "PENDING",
    "WAITING": "PENDING",
    "SUBMITTED": "PENDING",
    "REVIEW": "PENDING",
    "REVIEWING": "PENDING",
    "IN_REVIEW": "PENDING",
    "UNDER_REVIEW": "PENDING",
    "APPROVED": "APPROVED",
    "ACCEPTED": "APPROVED",
    "VERIFIED": "APPROVED",
    "REJECTED": "REJECTED",
    "DECLINED": "REJECTED",
    "DENIED": "REJECTED",
}

INSTRUCTOR_COMPLAINT_ALIASES = {
    "NEW": "NEW",
    "PENDING": "NEW",
    "REVIEW": "REVIEWING",
    "REVIEWING": "REVIEWING",
    "IN_REVIEW": "REVIEWING",
    "UNDER_REVIEW": "REVIEWING",
    "RESOLVED": "RESOLVED",
    "CLOSED": "RESOLVED",
    "REJECTED": "RESOLVED",
}


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_check_constraint(table_name: str, constraint_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(constraint.get("name") == constraint_name for constraint in inspector.get_check_constraints(table_name))


def _status_token_expr(column_name: str = "status") -> str:
    return f"upper(regexp_replace(trim(coalesce({column_name}, '')), '[^A-Za-z0-9]+', '_', 'g'))"


def _quoted_values(values: list[str]) -> str:
    return ", ".join(f"'{value}'" for value in values)


def _case_sql(aliases: dict[str, str], fallback: str, *, column_name: str = "status") -> str:
    expr = _status_token_expr(column_name)
    cases = "\n".join(
        f"            WHEN '{legacy_value}' THEN '{canonical_value}'"
        for legacy_value, canonical_value in sorted(aliases.items())
    )
    return (
        f"CASE {expr}\n"
        f"{cases}\n"
        f"            ELSE '{fallback}'\n"
        "        END"
    )


def _ensure_audit_table() -> None:
    if _has_table("admin_status_migration_audit"):
        return

    op.create_table(
        "admin_status_migration_audit",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("table_name", sa.String(length=128), nullable=False),
        sa.Column("column_name", sa.String(length=128), nullable=False),
        sa.Column("row_id", sa.String(length=64), nullable=False),
        sa.Column("legacy_value", sa.String(length=255), nullable=True),
        sa.Column("normalized_token", sa.String(length=64), nullable=False),
        sa.Column("fallback_value", sa.String(length=64), nullable=False),
        sa.Column(
            "logged_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('utc', now())"),
        ),
    )


def _normalize_status_column(
    table_name: str,
    *,
    aliases: dict[str, str],
    fallback: str,
    constraint_name: str,
) -> None:
    if not _has_table(table_name):
        return

    _ensure_audit_table()

    allowed_values = sorted(set(aliases.values()) | {fallback})
    allowed_values_sql = _quoted_values(sorted(aliases.keys()))
    canonical_values_sql = _quoted_values(allowed_values)
    token_expr = _status_token_expr()
    case_sql = _case_sql(aliases, fallback)

    op.execute(
        sa.text(
            f"""
            INSERT INTO admin_status_migration_audit (
                table_name,
                column_name,
                row_id,
                legacy_value,
                normalized_token,
                fallback_value
            )
            SELECT
                '{table_name}',
                'status',
                id::text,
                status,
                {token_expr},
                '{fallback}'
            FROM {table_name}
            WHERE status IS NOT NULL
              AND btrim(status) <> ''
              AND {token_expr} NOT IN ({allowed_values_sql})
            """
        )
    )

    op.execute(
        sa.text(
            f"""
            UPDATE {table_name}
            SET status = {case_sql}
            """
        )
    )

    if not _has_check_constraint(table_name, constraint_name):
        op.create_check_constraint(
            constraint_name,
            table_name,
            f"status IN ({canonical_values_sql})",
        )


def upgrade() -> None:
    _normalize_status_column(
        "driving_school_leads",
        aliases=SCHOOL_LEAD_ALIASES,
        fallback="NEW",
        constraint_name="ck_driving_school_leads_status_canonical",
    )
    _normalize_status_column(
        "driving_school_partner_applications",
        aliases=SCHOOL_APPLICATION_ALIASES,
        fallback="PENDING",
        constraint_name="ck_driving_school_partner_applications_status_canonical",
    )
    _normalize_status_column(
        "driving_instructor_leads",
        aliases=INSTRUCTOR_LEAD_ALIASES,
        fallback="NEW",
        constraint_name="ck_driving_instructor_leads_status_canonical",
    )
    _normalize_status_column(
        "driving_instructor_applications",
        aliases=INSTRUCTOR_APPLICATION_ALIASES,
        fallback="PENDING",
        constraint_name="ck_driving_instructor_applications_status_canonical",
    )
    _normalize_status_column(
        "driving_instructor_complaints",
        aliases=INSTRUCTOR_COMPLAINT_ALIASES,
        fallback="NEW",
        constraint_name="ck_driving_instructor_complaints_status_canonical",
    )


def downgrade() -> None:
    for table_name, constraint_name in (
        ("driving_instructor_complaints", "ck_driving_instructor_complaints_status_canonical"),
        ("driving_instructor_applications", "ck_driving_instructor_applications_status_canonical"),
        ("driving_instructor_leads", "ck_driving_instructor_leads_status_canonical"),
        ("driving_school_partner_applications", "ck_driving_school_partner_applications_status_canonical"),
        ("driving_school_leads", "ck_driving_school_leads_status_canonical"),
    ):
        if _has_table(table_name) and _has_check_constraint(table_name, constraint_name):
            op.drop_constraint(constraint_name, table_name, type_="check")

    if _has_table("admin_status_migration_audit"):
        op.drop_table("admin_status_migration_audit")
