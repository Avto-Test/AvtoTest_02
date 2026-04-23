"""Admin-facing experiment analytics aggregations."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.analytics.schemas import AdminExperimentSummary, AdminExperimentVariantSummary
from models.analytics_event import AnalyticsEvent
from models.experiment import Experiment
from models.user_experiment import UserExperiment
from services.experiments import DEFAULT_EXPERIMENT_NAME

CLICK_EVENTS = ("premium_click", "upgrade_click", "premium_upgrade_click")
PAYMENT_EVENTS = ("payment_success",)
SUPPORTED_VARIANTS = ("A", "B")
MIN_USERS_PER_VARIANT = 100
MIN_DURATION_DAYS = 3
WINNER_DELTA_THRESHOLD = 10.0


def _safe_percent(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def _build_recommendation(
    *,
    winner: str | None,
    minimum_duration_met: bool,
    minimum_sample_met: bool,
) -> str:
    if not minimum_duration_met:
        return "Eksperimentni kamida 3 kun davom ettiring."
    if not minimum_sample_met:
        return "Har bir variant uchun kamida 100 foydalanuvchi to'plang."
    if winner == "A":
        return "A varianti yaxshiroq natija bermoqda. Uni global default qilishni ko'rib chiqing."
    if winner == "B":
        return "B varianti yaxshiroq natija bermoqda. Uni global default qilishni ko'rib chiqing."
    return "Ahamiyatli ustunlik yo'q. Testni davom ettirib ko'proq ma'lumot yig'ing."


def _resolve_confidence_level(
    *,
    winner: str | None,
    delta: float,
    minimum_duration_met: bool,
    minimum_sample_met: bool,
) -> str:
    if not minimum_duration_met or not minimum_sample_met:
        return "insufficient_data"
    if winner is None:
        return "low"
    if delta >= 20:
        return "high"
    if delta >= WINNER_DELTA_THRESHOLD:
        return "medium"
    return "low"


async def get_admin_experiment_summary(
    db: AsyncSession,
    *,
    experiment_name: str = DEFAULT_EXPERIMENT_NAME,
) -> AdminExperimentSummary:
    """Return variant-level click and payment outcomes for the target experiment."""

    experiment = await db.scalar(
        select(Experiment).where(Experiment.name == experiment_name)
    )
    if experiment is None:
        empty_variant = AdminExperimentVariantSummary(
            assigned_users=0,
            clicks=0,
            payments=0,
            conversion_rate=0.0,
        )
        return AdminExperimentSummary(
            experiment=experiment_name,
            winner=None,
            confidence_level="insufficient_data",
            recommendation="Eksperiment hali ishga tushmagan.",
            days_running=0,
            minimum_duration_met=False,
            minimum_sample_met=False,
            variant_A=empty_variant,
            variant_B=empty_variant,
        )

    variant_expr = AnalyticsEvent.metadata_json["variant"].astext
    experiment_expr = AnalyticsEvent.metadata_json["experiment"].astext
    assignment_variant_expr = UserExperiment.variant

    assignment_stmt = (
        select(
            assignment_variant_expr.label("variant"),
            func.count(UserExperiment.id).label("count"),
            func.min(UserExperiment.assigned_at).label("first_assigned_at"),
        )
        .where(
            UserExperiment.experiment_id == experiment.id,
            assignment_variant_expr.in_(SUPPORTED_VARIANTS),
        )
        .group_by(assignment_variant_expr)
    )

    click_stmt = (
        select(
            variant_expr.label("variant"),
            func.count(AnalyticsEvent.id).label("count"),
        )
        .where(
            experiment_expr == experiment_name,
            variant_expr.in_(SUPPORTED_VARIANTS),
            func.lower(AnalyticsEvent.event_name).in_(CLICK_EVENTS),
        )
        .group_by(variant_expr)
    )
    payment_stmt = (
        select(
            variant_expr.label("variant"),
            func.count(AnalyticsEvent.id).label("count"),
        )
        .where(
            experiment_expr == experiment_name,
            variant_expr.in_(SUPPORTED_VARIANTS),
            func.lower(AnalyticsEvent.event_name).in_(PAYMENT_EVENTS),
        )
        .group_by(variant_expr)
    )

    assignment_rows = (await db.execute(assignment_stmt)).all()
    click_result = await db.execute(click_stmt)
    payment_result = await db.execute(payment_stmt)

    assignments_by_variant = {
        str(row.variant): int(row.count or 0)
        for row in assignment_rows
    }
    first_assignment_candidates = [
        row.first_assigned_at
        for row in assignment_rows
        if getattr(row, "first_assigned_at", None) is not None
    ]

    clicks_by_variant = {
        str(row.variant): int(row.count or 0)
        for row in click_result
    }
    payments_by_variant = {
        str(row.variant): int(row.count or 0)
        for row in payment_result
    }

    first_assignment_at = min(first_assignment_candidates) if first_assignment_candidates else experiment.created_at
    now_utc = datetime.now(timezone.utc)
    days_running = max(0, (now_utc - first_assignment_at).days)
    minimum_duration_met = days_running >= MIN_DURATION_DAYS
    minimum_sample_met = all(assignments_by_variant.get(variant, 0) >= MIN_USERS_PER_VARIANT for variant in SUPPORTED_VARIANTS)

    def _build_variant_summary(variant: str) -> AdminExperimentVariantSummary:
        assigned_users = assignments_by_variant.get(variant, 0)
        clicks = clicks_by_variant.get(variant, 0)
        payments = payments_by_variant.get(variant, 0)
        return AdminExperimentVariantSummary(
            assigned_users=assigned_users,
            clicks=clicks,
            payments=payments,
            conversion_rate=_safe_percent(payments, assigned_users),
        )

    variant_a = _build_variant_summary("A")
    variant_b = _build_variant_summary("B")
    delta = round(abs(variant_b.conversion_rate - variant_a.conversion_rate), 1)

    winner: str | None = None
    if minimum_duration_met and minimum_sample_met and delta > WINNER_DELTA_THRESHOLD:
        winner = "B" if variant_b.conversion_rate > variant_a.conversion_rate else "A"

    return AdminExperimentSummary(
        experiment=experiment_name,
        winner=winner,
        confidence_level=_resolve_confidence_level(
            winner=winner,
            delta=delta,
            minimum_duration_met=minimum_duration_met,
            minimum_sample_met=minimum_sample_met,
        ),
        recommendation=_build_recommendation(
            winner=winner,
            minimum_duration_met=minimum_duration_met,
            minimum_sample_met=minimum_sample_met,
        ),
        days_running=days_running,
        minimum_duration_met=minimum_duration_met,
        minimum_sample_met=minimum_sample_met,
        variant_A=variant_a,
        variant_B=variant_b,
    )
