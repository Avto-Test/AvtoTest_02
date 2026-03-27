"""Experiment assignment and analytics-event helpers."""

from __future__ import annotations

from collections.abc import Mapping
from secrets import choice
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics_event import AnalyticsEvent
from models.experiment import Experiment
from models.user_experiment import UserExperiment

DEFAULT_EXPERIMENT_NAME = "upgrade_button"
DEFAULT_EXPERIMENT_VARIANTS = ["A", "B"]


def _normalize_variants(raw_variants: list[str] | tuple[str, ...] | None) -> list[str]:
    normalized: list[str] = []
    for value in raw_variants or []:
        token = str(value or "").strip()
        if token and token not in normalized:
            normalized.append(token)
    return normalized or list(DEFAULT_EXPERIMENT_VARIANTS)


async def ensure_default_experiment_exists(db: AsyncSession) -> Experiment:
    """Ensure the primary upgrade CTA experiment exists for runtime assignment."""

    result = await db.execute(
        select(Experiment).where(Experiment.name == DEFAULT_EXPERIMENT_NAME)
    )
    experiment = result.scalar_one_or_none()
    if experiment is not None:
        if not experiment.variants:
            experiment.variants = list(DEFAULT_EXPERIMENT_VARIANTS)
        return experiment

    experiment = Experiment(
        name=DEFAULT_EXPERIMENT_NAME,
        is_active=True,
        variants=list(DEFAULT_EXPERIMENT_VARIANTS),
    )
    db.add(experiment)
    await db.flush()
    return experiment


async def get_user_experiment_variants(
    db: AsyncSession,
    *,
    user_id: UUID,
) -> dict[str, str]:
    """Return stable assignments for all active experiments, creating missing ones once."""

    await ensure_default_experiment_exists(db)

    result = await db.execute(
        select(Experiment).where(Experiment.is_active.is_(True)).order_by(Experiment.created_at.asc())
    )
    experiments = list(result.scalars().all())
    if not experiments:
        return {}

    experiment_ids = [experiment.id for experiment in experiments]
    assignment_result = await db.execute(
        select(UserExperiment).where(
            UserExperiment.user_id == user_id,
            UserExperiment.experiment_id.in_(experiment_ids),
        )
    )
    assignments = {
        assignment.experiment_id: assignment.variant
        for assignment in assignment_result.scalars().all()
    }

    resolved: dict[str, str] = {}
    for experiment in experiments:
        existing_variant = assignments.get(experiment.id)
        if existing_variant:
            resolved[experiment.name] = existing_variant
            continue

        variants = _normalize_variants(experiment.variants)
        assigned_variant = choice(variants)
        insert_stmt = (
            pg_insert(UserExperiment)
            .values(
                user_id=user_id,
                experiment_id=experiment.id,
                variant=assigned_variant,
            )
            .on_conflict_do_nothing(
                index_elements=["user_id", "experiment_id"],
            )
            .returning(UserExperiment.variant)
        )
        insert_result = await db.execute(insert_stmt)
        persisted_variant = insert_result.scalar_one_or_none()
        if persisted_variant is None:
            existing_result = await db.execute(
                select(UserExperiment.variant).where(
                    UserExperiment.user_id == user_id,
                    UserExperiment.experiment_id == experiment.id,
                )
            )
            persisted_variant = existing_result.scalar_one()

        resolved[experiment.name] = persisted_variant

    return resolved


def merge_experiment_metadata(
    metadata: Mapping[str, Any] | None,
    assignments: Mapping[str, str],
) -> dict[str, Any]:
    """Attach canonical experiment fields to analytics metadata."""

    payload = dict(metadata or {})
    if not assignments:
        return payload

    primary_variant = assignments.get(DEFAULT_EXPERIMENT_NAME)
    if primary_variant:
        payload["experiment"] = DEFAULT_EXPERIMENT_NAME
        payload["variant"] = primary_variant
    payload["experiments"] = dict(assignments)
    return payload


async def build_experiment_enriched_metadata(
    db: AsyncSession,
    *,
    user_id: UUID | None,
    metadata: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Resolve assignments and merge them into metadata when a user is known."""

    if user_id is None:
        return dict(metadata or {})

    assignments = await get_user_experiment_variants(db, user_id=user_id)
    return merge_experiment_metadata(metadata, assignments)


async def record_experiment_event(
    db: AsyncSession,
    *,
    user_id: UUID | None,
    event_name: str,
    metadata: Mapping[str, Any] | None = None,
) -> AnalyticsEvent:
    """Persist an analytics event with stable experiment metadata attached."""

    event = AnalyticsEvent(
        user_id=user_id,
        event_name=event_name[:100],
        metadata_json=await build_experiment_enriched_metadata(
            db,
            user_id=user_id,
            metadata=metadata,
        ),
    )
    db.add(event)
    return event
