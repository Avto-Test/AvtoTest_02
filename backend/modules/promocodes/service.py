"""
Promocode domain services.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.rbac import STUDENT_ROLE
from models.driving_school import DrivingSchool
from models.promo_code import PromoCode
from models.promo_redemption import PromoRedemption
from models.role import Role
from models.school_membership import SchoolMembership
from models.subscription_plan import SubscriptionPlan
from models.user import User
from services.payments.types import utc_now

PROMOCODE_INVALID_ERROR_CODE = "PROMOCODE_INVALID"
PROMOCODE_DEFAULT_ERROR_MESSAGE = "Promocode not found or inactive"


class PromoCodeServiceError(Exception):
    """Domain error for promocode application and validation."""

    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(slots=True)
class PromoCheckoutResolution:
    """Validated checkout promo state for the current user."""

    promo: PromoCode
    existing_redemption: PromoRedemption | None


@dataclass(slots=True)
class PromoApplyResult:
    """Result of a successful promocode application."""

    promo: PromoCode
    discount_percent: int | None
    school_linked: bool
    group_assigned: bool


def normalize_promo_code(code: str | None) -> str:
    """Normalize incoming promo code values."""

    return (code or "").strip().upper()


def get_discount_percent(promo: PromoCode) -> int | None:
    """Return a percent discount if the promo is percentage-based."""

    if promo.discount_type != "percent" or promo.discount_value <= 0:
        return None
    return promo.discount_value


def get_usage_limit(promo: PromoCode) -> int | None:
    """Return the effective usage ceiling for the promo."""

    if promo.max_uses is not None:
        return promo.max_uses
    return promo.max_redemptions


def get_usage_count(promo: PromoCode) -> int:
    """Return the effective usage count for the promo."""

    if promo.current_uses:
        return int(promo.current_uses)
    return int(promo.redeemed_count or 0)


async def set_promo_applicable_plans(
    promo: PromoCode,
    applicable_plan_ids: list[UUID],
    db: AsyncSession,
) -> None:
    """Assign promo applicability to specific subscription plans."""

    if not applicable_plan_ids:
        promo.applicable_plans = []
        return

    unique_plan_ids = list(dict.fromkeys(applicable_plan_ids))
    result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id.in_(unique_plan_ids))
    )
    plans = list(result.scalars().all())
    found_plan_ids = {plan.id for plan in plans}
    missing_ids = [plan_id for plan_id in unique_plan_ids if plan_id not in found_plan_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown plan IDs: {', '.join(str(pid) for pid in missing_ids)}",
        )
    promo.applicable_plans = plans


async def validate_promo_school_link(
    db: AsyncSession,
    *,
    school_id: UUID | None,
    group_id: UUID | None,
) -> None:
    """Validate school/group linkage for promo creation and updates."""

    if group_id is not None and school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="group_id requires school_id",
        )

    if school_id is None:
        return

    result = await db.execute(select(DrivingSchool.id).where(DrivingSchool.id == school_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driving school not found",
        )


async def _get_promo_by_code(
    code: str,
    db: AsyncSession,
    *,
    with_plans: bool,
    for_update: bool,
) -> PromoCode | None:
    stmt = select(PromoCode).where(func.upper(PromoCode.code) == code)
    if with_plans:
        stmt = stmt.options(selectinload(PromoCode.applicable_plans))
    if for_update:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _get_existing_redemption(
    promo_id: UUID,
    user_id: UUID,
    db: AsyncSession,
    *,
    for_update: bool,
) -> PromoRedemption | None:
    stmt = (
        select(PromoRedemption)
        .where(
            PromoRedemption.promo_code_id == promo_id,
            PromoRedemption.user_id == user_id,
        )
        .order_by(PromoRedemption.redeemed_at.asc())
    )
    if for_update:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    return result.scalars().first()


def _validate_promo_window(promo: PromoCode) -> None:
    now = utc_now()
    if not promo.is_active:
        raise PromoCodeServiceError("Promocode not found or inactive")
    if promo.starts_at is not None and promo.starts_at > now:
        raise PromoCodeServiceError("Promocode is not active yet")
    if promo.expires_at is not None and promo.expires_at <= now:
        raise PromoCodeServiceError("Promocode has expired")


def _validate_promo_usage(
    promo: PromoCode,
    *,
    existing_redemption: PromoRedemption | None,
) -> None:
    usage_limit = get_usage_limit(promo)
    if usage_limit is None:
        return

    if existing_redemption is not None:
        return

    if get_usage_count(promo) >= usage_limit:
        raise PromoCodeServiceError("Promocode usage limit reached")


def _validate_plan_applicability(
    promo: PromoCode,
    selected_plan: SubscriptionPlan | None,
) -> None:
    if selected_plan is None or not promo.applicable_plans:
        return

    applicable_ids = {plan.id for plan in promo.applicable_plans}
    if selected_plan.id not in applicable_ids:
        raise PromoCodeServiceError("Promocode is not applicable to the selected plan")


async def resolve_checkout_promo(
    *,
    promo_code: str | None,
    selected_plan: SubscriptionPlan | None,
    current_user_id: UUID | None,
    db: AsyncSession,
) -> PromoCheckoutResolution | None:
    """Validate a promo for checkout or quote flows."""

    normalized_code = normalize_promo_code(promo_code)
    if not normalized_code:
        return None

    promo = await _get_promo_by_code(
        normalized_code,
        db,
        with_plans=True,
        for_update=False,
    )
    if promo is None:
        raise PromoCodeServiceError("Promo code not found.", status_code=404)

    existing_redemption = None
    if current_user_id is not None:
        existing_redemption = await _get_existing_redemption(
            promo.id,
            current_user_id,
            db,
            for_update=False,
        )
        if existing_redemption is not None and existing_redemption.payment_id is not None:
            raise PromoCodeServiceError("Promo code already used by this user.")

    _validate_promo_window(promo)
    _validate_promo_usage(promo, existing_redemption=existing_redemption)
    _validate_plan_applicability(promo, selected_plan)

    return PromoCheckoutResolution(
        promo=promo,
        existing_redemption=existing_redemption,
    )


async def _resolve_student_role_id(db: AsyncSession) -> UUID:
    result = await db.execute(select(Role.id).where(Role.name == STUDENT_ROLE))
    role_id = result.scalar_one_or_none()
    if role_id is None:
        raise PromoCodeServiceError("Student role is not configured", status_code=500)
    return role_id


async def apply_promocode(
    *,
    code: str,
    user: User,
    db: AsyncSession,
) -> PromoApplyResult:
    """Apply a promo code, reserve its usage, and link school membership."""

    normalized_code = normalize_promo_code(code)
    if not normalized_code:
        raise PromoCodeServiceError(PROMOCODE_DEFAULT_ERROR_MESSAGE)

    async with db.begin_nested() if db.in_transaction() else db.begin():
        promo = await _get_promo_by_code(
            normalized_code,
            db,
            with_plans=False,
            for_update=True,
        )
        if promo is None:
            raise PromoCodeServiceError(PROMOCODE_DEFAULT_ERROR_MESSAGE, status_code=404)

        existing_redemption = await _get_existing_redemption(
            promo.id,
            user.id,
            db,
            for_update=True,
        )
        if existing_redemption is not None:
            raise PromoCodeServiceError("Promocode already used by this user")

        _validate_promo_window(promo)
        _validate_promo_usage(promo, existing_redemption=existing_redemption)

        if promo.group_id is not None and promo.school_id is None:
            raise PromoCodeServiceError("Promocode group assignment requires a school link", status_code=500)

        school_linked = False
        group_assigned = False

        if promo.school_id is not None:
            student_role_id = await _resolve_student_role_id(db)
            membership_result = await db.execute(
                select(SchoolMembership)
                .where(SchoolMembership.user_id == user.id)
                .order_by(SchoolMembership.joined_at.asc())
                .with_for_update()
            )
            memberships = list(membership_result.scalars().all())

            same_school_membership = next(
                (membership for membership in memberships if membership.school_id == promo.school_id),
                None,
            )
            conflicting_membership = next(
                (membership for membership in memberships if membership.school_id != promo.school_id),
                None,
            )

            if conflicting_membership is not None:
                raise PromoCodeServiceError(
                    "Promocode cannot override an existing school membership",
                    status_code=409,
                )

            if same_school_membership is None:
                same_school_membership = SchoolMembership(
                    user_id=user.id,
                    school_id=promo.school_id,
                    group_id=promo.group_id,
                    role_id=student_role_id,
                )
                db.add(same_school_membership)
            else:
                if same_school_membership.role_id != student_role_id:
                    raise PromoCodeServiceError(
                        "Promocode cannot override an existing school role",
                        status_code=409,
                    )
                if (
                    promo.group_id is not None
                    and same_school_membership.group_id is not None
                    and same_school_membership.group_id != promo.group_id
                ):
                    raise PromoCodeServiceError(
                        "Promocode cannot override an existing school group assignment",
                        status_code=409,
                    )
                if same_school_membership.group_id is None and promo.group_id is not None:
                    same_school_membership.group_id = promo.group_id

            school_linked = True
            group_assigned = same_school_membership.group_id == promo.group_id if promo.group_id is not None else False

        db.add(
            PromoRedemption(
                promo_code_id=promo.id,
                user_id=user.id,
                payment_id=None,
            )
        )
        promo.current_uses = get_usage_count(promo) + 1
        promo.updated_at = utc_now()

    return PromoApplyResult(
        promo=promo,
        discount_percent=get_discount_percent(promo),
        school_linked=school_linked,
        group_assigned=group_assigned,
    )


async def record_promo_redemption(
    *,
    promo: PromoCode,
    user_id: UUID,
    payment_id: UUID,
    db: AsyncSession,
) -> PromoRedemption:
    """Attach or create a promo redemption record for a successful payment."""

    existing_redemption = await _get_existing_redemption(
        promo.id,
        user_id,
        db,
        for_update=False,
    )
    if existing_redemption is not None:
        if existing_redemption.payment_id is None:
            existing_redemption.payment_id = payment_id
            promo.redeemed_count += 1
            promo.updated_at = utc_now()
        return existing_redemption

    redemption = PromoRedemption(
        promo_code_id=promo.id,
        user_id=user_id,
        payment_id=payment_id,
    )
    db.add(redemption)
    promo.current_uses = max(get_usage_count(promo), promo.redeemed_count) + 1
    promo.redeemed_count += 1
    promo.updated_at = utc_now()
    return redemption


__all__ = [
    "PROMOCODE_DEFAULT_ERROR_MESSAGE",
    "PROMOCODE_INVALID_ERROR_CODE",
    "PromoApplyResult",
    "PromoCheckoutResolution",
    "PromoCodeServiceError",
    "apply_promocode",
    "get_discount_percent",
    "get_usage_count",
    "get_usage_limit",
    "normalize_promo_code",
    "record_promo_redemption",
    "resolve_checkout_promo",
    "set_promo_applicable_plans",
    "validate_promo_school_link",
]
