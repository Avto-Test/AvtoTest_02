"""Shared admin analytics aggregations."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.analytics.schemas import (
    AdminAnalyticsSummary,
    AdminCategoryPerformanceItem,
    AdminMetricTrendSnapshot,
)
from core.admin_statuses import (
    DrivingInstructorApplicationStatus,
    DrivingSchoolPartnerApplicationStatus,
)
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.driving_instructor_application import DrivingInstructorApplication
from models.driving_instructor_lead import DrivingInstructorLead
from models.driving_school_partner_application import DrivingSchoolPartnerApplication
from models.driving_school_lead import DrivingSchoolLead
from models.question import Question
from models.question_category import QuestionCategory
from models.subscription import Subscription
from models.user import User

ACTIVE_PAID_SUBSCRIPTION_STATUSES = ("active", "trialing")


def _utc_day_windows(reference_time: datetime) -> tuple[datetime, datetime, datetime]:
    current_day_start = reference_time.replace(hour=0, minute=0, second=0, microsecond=0)
    previous_day_start = current_day_start - timedelta(days=1)
    return previous_day_start, current_day_start, reference_time


async def get_admin_analytics_summary(db: AsyncSession) -> AdminAnalyticsSummary:
    """Return the canonical admin analytics snapshot sourced from database aggregates only."""
    now_utc = datetime.now(timezone.utc)
    previous_day_start, current_day_start, current_window_end = _utc_day_windows(now_utc)

    total_users_sq = select(func.count(User.id)).scalar_subquery()
    active_users_sq = (
        select(func.count(User.id))
        .where(User.is_active.is_(True))
        .scalar_subquery()
    )
    premium_users_sq = (
        select(func.count(func.distinct(Subscription.user_id)))
        .where(
            func.lower(Subscription.plan) != "free",
            func.lower(Subscription.status).in_(ACTIVE_PAID_SUBSCRIPTION_STATUSES),
            (Subscription.expires_at.is_(None)) | (Subscription.expires_at > func.now()),
        )
        .scalar_subquery()
    )
    total_questions_sq = select(func.count(Question.id)).scalar_subquery()
    school_applications_sq = select(func.count(DrivingSchoolPartnerApplication.id)).scalar_subquery()
    instructor_applications_sq = select(func.count(DrivingInstructorApplication.id)).scalar_subquery()
    pending_school_applications_sq = (
        select(func.count(DrivingSchoolPartnerApplication.id))
        .where(
            func.upper(DrivingSchoolPartnerApplication.status)
            == DrivingSchoolPartnerApplicationStatus.PENDING.value
        )
        .scalar_subquery()
    )
    pending_instructor_applications_sq = (
        select(func.count(DrivingInstructorApplication.id))
        .where(
            func.upper(DrivingInstructorApplication.status)
            == DrivingInstructorApplicationStatus.PENDING.value
        )
        .scalar_subquery()
    )
    recent_school_leads_sq = (
        select(func.count(DrivingSchoolLead.id))
        .where(DrivingSchoolLead.created_at >= now_utc - timedelta(days=7))
        .scalar_subquery()
    )
    recent_instructor_leads_sq = (
        select(func.count(DrivingInstructorLead.id))
        .where(DrivingInstructorLead.created_at >= now_utc - timedelta(days=7))
        .scalar_subquery()
    )
    current_accuracy_sq = (
        select(
            func.avg(
                (Attempt.score * 100.0) / func.nullif(Attempt.question_count, 0)
            )
        )
        .where(
            Attempt.finished_at.is_not(None),
            Attempt.finished_at >= current_day_start,
            Attempt.finished_at < current_window_end,
            Attempt.question_count > 0,
        )
        .scalar_subquery()
    )
    previous_accuracy_sq = (
        select(
            func.avg(
                (Attempt.score * 100.0) / func.nullif(Attempt.question_count, 0)
            )
        )
        .where(
            Attempt.finished_at.is_not(None),
            Attempt.finished_at >= previous_day_start,
            Attempt.finished_at < current_day_start,
            Attempt.question_count > 0,
        )
        .scalar_subquery()
    )
    current_accuracy_sample_sq = (
        select(func.count(Attempt.id))
        .where(
            Attempt.finished_at.is_not(None),
            Attempt.finished_at >= current_day_start,
            Attempt.finished_at < current_window_end,
            Attempt.question_count > 0,
        )
        .scalar_subquery()
    )
    previous_accuracy_sample_sq = (
        select(func.count(Attempt.id))
        .where(
            Attempt.finished_at.is_not(None),
            Attempt.finished_at >= previous_day_start,
            Attempt.finished_at < current_day_start,
            Attempt.question_count > 0,
        )
        .scalar_subquery()
    )
    current_active_users_trend_sq = (
        select(func.count(func.distinct(Attempt.user_id)))
        .where(
            Attempt.finished_at.is_not(None),
            Attempt.finished_at >= current_day_start,
            Attempt.finished_at < current_window_end,
        )
        .scalar_subquery()
    )
    previous_active_users_trend_sq = (
        select(func.count(func.distinct(Attempt.user_id)))
        .where(
            Attempt.finished_at.is_not(None),
            Attempt.finished_at >= previous_day_start,
            Attempt.finished_at < current_day_start,
        )
        .scalar_subquery()
    )
    current_school_applications_sq = (
        select(func.count(DrivingSchoolPartnerApplication.id))
        .where(
            DrivingSchoolPartnerApplication.created_at >= current_day_start,
            DrivingSchoolPartnerApplication.created_at < current_window_end,
        )
        .scalar_subquery()
    )
    previous_school_applications_sq = (
        select(func.count(DrivingSchoolPartnerApplication.id))
        .where(
            DrivingSchoolPartnerApplication.created_at >= previous_day_start,
            DrivingSchoolPartnerApplication.created_at < current_day_start,
        )
        .scalar_subquery()
    )
    current_instructor_applications_sq = (
        select(func.count(DrivingInstructorApplication.id))
        .where(
            DrivingInstructorApplication.created_at >= current_day_start,
            DrivingInstructorApplication.created_at < current_window_end,
        )
        .scalar_subquery()
    )
    previous_instructor_applications_sq = (
        select(func.count(DrivingInstructorApplication.id))
        .where(
            DrivingInstructorApplication.created_at >= previous_day_start,
            DrivingInstructorApplication.created_at < current_day_start,
        )
        .scalar_subquery()
    )

    result = await db.execute(
        select(
            total_users_sq.label("total_users"),
            active_users_sq.label("active_users"),
            premium_users_sq.label("premium_users"),
            total_questions_sq.label("total_questions"),
            (school_applications_sq + instructor_applications_sq).label("total_applications"),
            (pending_school_applications_sq + pending_instructor_applications_sq).label(
                "pending_applications"
            ),
            (recent_school_leads_sq + recent_instructor_leads_sq).label("new_leads"),
            current_accuracy_sq.label("average_accuracy"),
            previous_accuracy_sq.label("previous_accuracy"),
            current_accuracy_sample_sq.label("current_accuracy_sample"),
            previous_accuracy_sample_sq.label("previous_accuracy_sample"),
            current_active_users_trend_sq.label("current_active_users_trend"),
            previous_active_users_trend_sq.label("previous_active_users_trend"),
            (current_school_applications_sq + current_instructor_applications_sq).label(
                "current_applications_trend"
            ),
            (previous_school_applications_sq + previous_instructor_applications_sq).label(
                "previous_applications_trend"
            ),
        )
    )
    row = result.mappings().one()

    average_accuracy = (
        round(float(row["average_accuracy"]), 1)
        if row["average_accuracy"] is not None
        else None
    )
    previous_accuracy = (
        round(float(row["previous_accuracy"]), 1)
        if row["previous_accuracy"] is not None
        else None
    )
    current_accuracy_sample = int(row["current_accuracy_sample"] or 0)
    previous_accuracy_sample = int(row["previous_accuracy_sample"] or 0)
    current_active_users_trend = int(row["current_active_users_trend"] or 0)
    previous_active_users_trend = int(row["previous_active_users_trend"] or 0)
    current_applications_trend = int(row["current_applications_trend"] or 0)
    previous_applications_trend = int(row["previous_applications_trend"] or 0)

    category_label = func.coalesce(
        QuestionCategory.name,
        Question.topic,
        Question.category,
        "Umumiy",
    )
    category_accuracy = func.avg(case((AttemptAnswer.is_correct.is_(True), 100.0), else_=0.0))
    category_rows = (
        await db.execute(
            select(
                category_label.label("category"),
                category_accuracy.label("accuracy"),
                func.count(AttemptAnswer.id).label("attempts"),
                func.count(func.distinct(Question.id)).label("question_count"),
            )
            .join(Question, AttemptAnswer.question_id == Question.id)
            .outerjoin(QuestionCategory, Question.category_id == QuestionCategory.id)
            .group_by(category_label)
            .having(func.count(AttemptAnswer.id) > 0)
            .order_by(category_accuracy.asc())
            .limit(6)
        )
    ).all()

    return AdminAnalyticsSummary(
        total_users=int(row["total_users"] or 0),
        active_users=int(row["active_users"] or 0),
        premium_users=int(row["premium_users"] or 0),
        total_questions=int(row["total_questions"] or 0),
        total_applications=int(row["total_applications"] or 0),
        pending_applications=int(row["pending_applications"] or 0),
        new_leads=int(row["new_leads"] or 0),
        average_accuracy=average_accuracy,
        accuracy_trend=AdminMetricTrendSnapshot(
            current=average_accuracy or 0.0,
            previous=previous_accuracy or 0.0,
            sample_size_current=current_accuracy_sample,
            sample_size_previous=previous_accuracy_sample,
        )
        if average_accuracy is not None or previous_accuracy is not None
        else None,
        active_users_trend=AdminMetricTrendSnapshot(
            current=float(current_active_users_trend),
            previous=float(previous_active_users_trend),
            sample_size_current=current_active_users_trend,
            sample_size_previous=previous_active_users_trend,
        ),
        applications_trend=AdminMetricTrendSnapshot(
            current=float(current_applications_trend),
            previous=float(previous_applications_trend),
            sample_size_current=current_applications_trend,
            sample_size_previous=previous_applications_trend,
        ),
        category_performance=[
            AdminCategoryPerformanceItem(
                category=str(category or "Umumiy"),
                accuracy=round(float(accuracy or 0.0), 1),
                attempts=int(attempts or 0),
                question_count=int(question_count or 0),
            )
            for category, accuracy, attempts, question_count in category_rows
        ],
    )
