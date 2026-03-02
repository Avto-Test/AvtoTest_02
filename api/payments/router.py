"""
AUTOTEST Payments Router
Production-grade subscription lifecycle endpoints using TSPay.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from uuid import UUID
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.router import get_current_user
from api.payments.schemas import (
    CheckoutPromoQuoteResponse,
    CheckoutQuoteResponse,
    CheckoutResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    PublicSubscriptionPlanResponse,
    RedeemPromoRequest,
    RedeemPromoResponse,
    TransactionStatusResponse,
    WebhookResponse,
)
from core.config import settings
from core.logging import get_logger
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.payment import Payment
from models.promo_code import PromoCode
from models.promo_redemption import PromoRedemption
from models.subscription import Subscription
from models.subscription_plan import SubscriptionPlan
from models.user import User
from services.payments.tspay import TSPayProvider
from services.payments.types import (
    CreateCheckoutSessionRequest,
    PaymentProviderError,
    PaymentReplayError,
    PaymentSignatureError,
    VerifiedWebhookEvent,
    utc_now,
)

router = APIRouter(tags=["payments"])
logger = get_logger(__name__)

PAYMENT_PROVIDER = TSPayProvider()
DEFAULT_PLAN_CODE = "premium"
DEFAULT_PLAN_DURATION_DAYS = 30


def _extract_signature(request: Request) -> str | None:
    candidate_headers = (
        "x-tspay-signature",
        "tspay-signature",
        "x-webhook-signature",
        # Temporary backward compatibility
        "stripe-signature",
    )
    for header in candidate_headers:
        value = request.headers.get(header)
        if value:
            return value
    return None


def _normalize_uuid(value: str | UUID | None) -> UUID | None:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


def _parse_positive_int(value: Any, *, default: int, minimum: int = 1, maximum: int = 3650) -> int:
    try:
        parsed = int(str(value))
    except (TypeError, ValueError):
        return default
    if parsed < minimum:
        return default
    if parsed > maximum:
        return maximum
    return parsed


def _normalize_plan_code(value: str | None) -> str:
    if not value:
        return DEFAULT_PLAN_CODE
    normalized = value.strip().lower()
    return normalized or DEFAULT_PLAN_CODE


def _calculate_discounted_amount(amount_cents: int, promo: PromoCode | None) -> int:
    if promo is None:
        return amount_cents

    if promo.discount_type == "percent":
        discount_percent = min(max(promo.discount_value, 0), 100)
        discounted = (amount_cents * (100 - discount_percent)) // 100
        return max(discounted, 0)

    if promo.discount_type == "fixed":
        return max(amount_cents - promo.discount_value, 0)

    return amount_cents


async def _resolve_checkout_plan(
    request_payload: CreateSessionRequest,
    db: AsyncSession,
) -> SubscriptionPlan | None:
    if request_payload.plan_id is not None:
        result = await db.execute(
            select(SubscriptionPlan).where(
                SubscriptionPlan.id == request_payload.plan_id,
                SubscriptionPlan.is_active == True,  # noqa: E712
            )
        )
        plan = result.scalar_one_or_none()
        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected plan not found or inactive.",
            )
        return plan

    result = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True)  # noqa: E712
        .order_by(SubscriptionPlan.sort_order.asc(), SubscriptionPlan.created_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _resolve_checkout_promo(
    promo_code: str | None,
    selected_plan: SubscriptionPlan | None,
    db: AsyncSession,
) -> PromoCode | None:
    if promo_code is None:
        return None

    normalized_code = promo_code.strip().upper()
    if not normalized_code:
        return None

    result = await db.execute(
        select(PromoCode)
        .where(func.upper(PromoCode.code) == normalized_code)
        .options(selectinload(PromoCode.applicable_plans))
    )
    promo = result.scalar_one_or_none()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found.")

    now = utc_now()
    if not promo.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code is inactive.")
    if promo.starts_at is not None and promo.starts_at > now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code is not active yet.")
    if promo.expires_at is not None and promo.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code has expired.")
    if promo.max_redemptions is not None and promo.redeemed_count >= promo.max_redemptions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo redemption limit reached.")

    if selected_plan is not None and promo.applicable_plans:
        applicable_ids = {plan.id for plan in promo.applicable_plans}
        if selected_plan.id not in applicable_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Promo code is not applicable to the selected plan.",
            )

    return promo


async def _resolve_webhook_user_id(
    event: VerifiedWebhookEvent,
    db: AsyncSession,
) -> UUID | None:
    direct_user_id = _normalize_uuid(event.user_id)
    if direct_user_id is not None:
        return direct_user_id

    metadata_user_id = _normalize_uuid(event.metadata.get("user_id"))
    if metadata_user_id is not None:
        return metadata_user_id

    lookup_filters = []
    if event.session_id:
        lookup_filters.append(Payment.provider_session_id == event.session_id)
        lookup_filters.append(Payment.provider_payment_id == event.session_id)
    if event.payment_id:
        lookup_filters.append(Payment.provider_payment_id == event.payment_id)
        lookup_filters.append(Payment.provider_session_id == event.payment_id)

    if lookup_filters:
        result = await db.execute(
            select(Payment.user_id)
            .where(or_(*lookup_filters))
            .order_by(Payment.created_at.desc())
            .limit(1)
        )
        user_id = result.scalar_one_or_none()
        normalized = _normalize_uuid(user_id)
        if normalized is not None:
            return normalized

    return None


async def _resolve_reference_payment(
    event: VerifiedWebhookEvent,
    db: AsyncSession,
) -> Payment | None:
    lookup_filters = []
    if event.session_id:
        lookup_filters.append(Payment.provider_session_id == event.session_id)
        lookup_filters.append(Payment.provider_payment_id == event.session_id)
    if event.payment_id:
        lookup_filters.append(Payment.provider_payment_id == event.payment_id)
        lookup_filters.append(Payment.provider_session_id == event.payment_id)

    if not lookup_filters:
        return None

    result = await db.execute(
        select(Payment)
        .where(Payment.provider == event.provider, or_(*lookup_filters))
        .order_by(Payment.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _amount_matches_reference(
    event_amount: int | None,
    reference_amount: int | None,
) -> bool:
    if event_amount is None or reference_amount is None:
        return True
    return int(event_amount) == int(reference_amount)


async def _has_settled_success_for_transaction(
    event: VerifiedWebhookEvent,
    db: AsyncSession,
) -> bool:
    """
    Prevent duplicate subscription activation for equivalent successful transactions.

    Some providers emit multiple success-like events with different event IDs for the
    same checkout/payment. This guard deduplicates by session/payment identifiers.
    """
    filters = []
    if event.payment_id:
        filters.append(Payment.provider_payment_id == event.payment_id)
    if event.session_id:
        filters.append(Payment.provider_session_id == event.session_id)

    if not filters:
        return False

    result = await db.execute(
        select(Payment.id).where(
            and_(
                Payment.provider == event.provider,
                Payment.status == "succeeded",
                Payment.processed_at.is_not(None),
                or_(*filters),
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def _activate_subscription(
    user_id: UUID,
    db: AsyncSession,
    provider: str,
    provider_subscription_id: str | None,
    plan_code: str,
    duration_days: int,
) -> Subscription:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    subscription = result.scalar_one_or_none()

    now = utc_now()
    safe_duration_days = max(1, duration_days)
    extension_duration = timedelta(days=safe_duration_days)
    normalized_plan_code = _normalize_plan_code(plan_code)

    if subscription is None:
        subscription = Subscription(
            user_id=user_id,
            plan=normalized_plan_code,
            status="active",
            provider=provider,
            provider_subscription_id=provider_subscription_id,
            starts_at=now,
            expires_at=now + extension_duration,
            cancel_at_period_end=False,
        )
        db.add(subscription)
        return subscription

    current_end = subscription.expires_at
    if (
        subscription.plan != "free"
        and subscription.status in {"active", "trialing"}
        and current_end is not None
        and current_end > now
    ):
        next_start = current_end
    else:
        next_start = now

    subscription.plan = normalized_plan_code
    subscription.status = "active"
    subscription.provider = provider
    subscription.provider_subscription_id = provider_subscription_id
    subscription.starts_at = now
    subscription.expires_at = next_start + extension_duration
    subscription.canceled_at = None
    subscription.cancel_at_period_end = False
    subscription.updated_at = now
    return subscription


async def _emit_upgrade_success_event(
    user_id: UUID,
    db: AsyncSession,
    payment: Payment,
    event: VerifiedWebhookEvent,
) -> None:
    db.add(
        AnalyticsEvent(
            user_id=user_id,
            event_name="upgrade_success",
            metadata_json={
                "provider": payment.provider,
                "payment_id": payment.provider_payment_id,
                "session_id": payment.provider_session_id,
                "provider_event_id": payment.provider_event_id,
                "event_type": event.event_type,
                "amount_cents": payment.amount_cents,
                "currency": payment.currency,
                "plan": event.metadata.get("plan"),
                "promo_code": event.metadata.get("promo_code"),
            },
        )
    )


async def _record_promo_redemption(
    event: VerifiedWebhookEvent,
    payment: Payment,
    user_id: UUID,
    db: AsyncSession,
) -> None:
    promo_id = _normalize_uuid(event.metadata.get("promo_id"))
    if promo_id is None:
        return

    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    if promo is None:
        return

    existing = await db.execute(
        select(PromoRedemption).where(PromoRedemption.payment_id == payment.id)
    )
    already_redeemed = existing.scalar_one_or_none()
    if already_redeemed is not None:
        return

    db.add(
        PromoRedemption(
            promo_code_id=promo.id,
            user_id=user_id,
            payment_id=payment.id,
        )
    )
    promo.redeemed_count += 1


async def _create_session(
    current_user: User,
    db: AsyncSession,
    request_payload: CreateSessionRequest,
) -> CreateSessionResponse:
    if current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active premium subscription.",
        )

    selected_plan = await _resolve_checkout_plan(request_payload=request_payload, db=db)
    plan_code = selected_plan.code if selected_plan is not None else DEFAULT_PLAN_CODE
    duration_days = selected_plan.duration_days if selected_plan is not None else DEFAULT_PLAN_DURATION_DAYS
    currency = selected_plan.currency if selected_plan is not None else "USD"
    base_amount_cents = (
        selected_plan.price_cents
        if selected_plan is not None
        else settings.PREMIUM_PRICE_USD * 100
    )

    promo = await _resolve_checkout_promo(
        promo_code=request_payload.promo_code,
        selected_plan=selected_plan,
        db=db,
    )
    final_amount_cents = _calculate_discounted_amount(base_amount_cents, promo)
    if final_amount_cents <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final price must be greater than 0 cents.",
        )

    idempotency_key = str(uuid.uuid4())
    metadata: dict[str, str] = {
        "user_id": str(current_user.id),
        "plan": plan_code,
        "duration_days": str(duration_days),
    }
    if selected_plan is not None:
        metadata["plan_id"] = str(selected_plan.id)
    if promo is not None:
        metadata.update(
            {
                "promo_id": str(promo.id),
                "promo_code": promo.code,
                "promo_discount_type": promo.discount_type,
                "promo_discount_value": str(promo.discount_value),
                "original_amount_cents": str(base_amount_cents),
                "final_amount_cents": str(final_amount_cents),
            }
        )

    payload = CreateCheckoutSessionRequest(
        user_id=str(current_user.id),
        email=current_user.email,
        amount_cents=final_amount_cents,
        currency=currency,
        success_url=settings.FRONTEND_SUCCESS_URL,
        cancel_url=settings.FRONTEND_CANCEL_URL,
        idempotency_key=idempotency_key,
        metadata=metadata,
    )

    try:
        session = await PAYMENT_PROVIDER.create_checkout_session(payload)
    except PaymentProviderError as exc:
        logger.error("TSPay create-session failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider unavailable.",
        ) from exc

    db.add(
        Payment(
            user_id=current_user.id,
            provider=session.provider,
            provider_session_id=session.session_id,
            status="session_created",
            amount_cents=payload.amount_cents,
            currency=payload.currency,
            idempotency_key=idempotency_key,
            raw_payload={
                "provider_session": session.raw_response,
                "plan": {
                    "id": str(selected_plan.id) if selected_plan is not None else None,
                    "code": plan_code,
                    "duration_days": duration_days,
                    "base_amount_cents": base_amount_cents,
                    "final_amount_cents": final_amount_cents,
                },
                "promo": (
                    {
                        "id": str(promo.id),
                        "code": promo.code,
                        "discount_type": promo.discount_type,
                        "discount_value": promo.discount_value,
                    }
                    if promo is not None
                    else None
                ),
            },
        )
    )
    await db.commit()

    return CreateSessionResponse(
        checkout_url=session.checkout_url,
        session_id=session.session_id,
        provider=session.provider,
    )


@router.get("/api/payments/plans", response_model=list[PublicSubscriptionPlanResponse])
async def list_checkout_plans(
    db: AsyncSession = Depends(get_db),
) -> list[SubscriptionPlan]:
    result = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True)  # noqa: E712
        .order_by(SubscriptionPlan.sort_order.asc(), SubscriptionPlan.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/api/payments/create-session", response_model=CreateSessionResponse)
async def create_session(
    request_payload: CreateSessionRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateSessionResponse:
    """
    Create a hosted TSPay checkout session for premium subscription upgrade.
    """
    payload = request_payload or CreateSessionRequest()
    return await _create_session(current_user=current_user, db=db, request_payload=payload)


@router.get("/api/payments/transactions/{cheque_id}", response_model=TransactionStatusResponse)
async def get_transaction_status(
    cheque_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TransactionStatusResponse:
    """
    Check TsPay cheque/transaction payment status.
    """
    normalized_cheque_id = cheque_id.strip()
    if not normalized_cheque_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="cheque_id is required.",
        )

    local_payment_result = await db.execute(
        select(Payment).where(
            Payment.provider == PAYMENT_PROVIDER.provider_name,
            or_(
                Payment.provider_session_id == normalized_cheque_id,
                Payment.provider_payment_id == normalized_cheque_id,
            ),
        )
    )
    local_payment = local_payment_result.scalar_one_or_none()
    if (
        local_payment is not None
        and local_payment.user_id is not None
        and local_payment.user_id != current_user.id
        and not current_user.is_admin
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    try:
        provider_status = await PAYMENT_PROVIDER.get_transaction_status(
            cheque_id=normalized_cheque_id
        )
    except PaymentProviderError as exc:
        logger.error(
            "TSPay transaction status check failed for cheque_id=%s: %s",
            normalized_cheque_id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider unavailable.",
        ) from exc

    return TransactionStatusResponse(
        cheque_id=provider_status.cheque_id,
        transaction_id=provider_status.transaction_id,
        pay_status=provider_status.pay_status,
        amount=provider_status.amount,
        provider=provider_status.provider,
        raw=provider_status.raw_response,
    )


@router.post("/api/payments/quote", response_model=CheckoutQuoteResponse)
async def create_checkout_quote(
    request_payload: CreateSessionRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutQuoteResponse:
    """
    Validate plan/promo combination and return pricing quote before checkout redirect.
    """
    payload = request_payload or CreateSessionRequest()
    selected_plan = await _resolve_checkout_plan(request_payload=payload, db=db)
    if selected_plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected plan not found or inactive.",
        )

    base_amount_cents = selected_plan.price_cents
    promo = await _resolve_checkout_promo(
        promo_code=payload.promo_code,
        selected_plan=selected_plan,
        db=db,
    )
    final_amount_cents = _calculate_discounted_amount(base_amount_cents, promo)

    promo_payload = None
    if promo is not None:
        promo_payload = CheckoutPromoQuoteResponse(
            id=promo.id,
            code=promo.code,
            discount_type=promo.discount_type,
            discount_value=promo.discount_value,
            savings_cents=max(base_amount_cents - final_amount_cents, 0),
        )

    return CheckoutQuoteResponse(
        plan_id=selected_plan.id,
        plan_name=selected_plan.name,
        duration_days=selected_plan.duration_days,
        currency=selected_plan.currency,
        base_amount_cents=base_amount_cents,
        final_amount_cents=final_amount_cents,
        promo=promo_payload,
    )


@router.post("/api/payments/redeem-promo", response_model=RedeemPromoResponse)
async def redeem_full_discount_promo(
    payload: RedeemPromoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RedeemPromoResponse:
    """
    Redeem a fully-discounted promo code without checkout redirect.
    """
    selected_plan = await _resolve_checkout_plan(
        request_payload=CreateSessionRequest(plan_id=payload.plan_id),
        db=db,
    )
    if selected_plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected plan not found or inactive.",
        )

    promo = await _resolve_checkout_promo(
        promo_code=payload.promo_code,
        selected_plan=selected_plan,
        db=db,
    )
    if promo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promo code not found.",
        )

    base_amount_cents = selected_plan.price_cents
    final_amount_cents = _calculate_discounted_amount(base_amount_cents, promo)
    if final_amount_cents > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code does not fully cover the selected plan.",
        )

    now = utc_now()
    payment = Payment(
        user_id=current_user.id,
        provider="promo",
        provider_event_id=f"promo_redeem:{uuid.uuid4()}",
        provider_session_id=f"promo_session:{uuid.uuid4()}",
        provider_payment_id=f"promo_payment:{uuid.uuid4()}",
        event_type="promo.redeem",
        status="succeeded",
        amount_cents=0,
        currency=selected_plan.currency,
        idempotency_key=str(uuid.uuid4()),
        processed_at=now,
        raw_payload={
            "source": "redeem_promo_endpoint",
            "user_id": str(current_user.id),
            "plan_id": str(selected_plan.id),
            "plan_code": selected_plan.code,
            "promo_id": str(promo.id),
            "promo_code": promo.code,
            "base_amount_cents": base_amount_cents,
            "final_amount_cents": final_amount_cents,
        },
    )
    db.add(payment)
    await db.flush()

    db.add(
        PromoRedemption(
            promo_code_id=promo.id,
            user_id=current_user.id,
            payment_id=payment.id,
        )
    )
    promo.redeemed_count += 1

    subscription = await _activate_subscription(
        user_id=current_user.id,
        db=db,
        provider="promo",
        provider_subscription_id=payment.provider_payment_id,
        plan_code=selected_plan.code,
        duration_days=selected_plan.duration_days,
    )

    db.add(
        AnalyticsEvent(
            user_id=current_user.id,
            event_name="upgrade_success",
            metadata_json={
                "provider": "promo",
                "payment_id": payment.provider_payment_id,
                "session_id": payment.provider_session_id,
                "provider_event_id": payment.provider_event_id,
                "event_type": "promo.redeem",
                "amount_cents": 0,
                "currency": selected_plan.currency,
                "plan": selected_plan.code,
                "plan_id": str(selected_plan.id),
                "promo_code": promo.code,
                "source": "promo_redeem",
            },
        )
    )

    await db.commit()

    return RedeemPromoResponse(
        activated=True,
        plan_code=selected_plan.code,
        plan_name=selected_plan.name,
        promo_code=promo.code,
        expires_at=subscription.expires_at,
    )


@router.post("/payments/checkout", response_model=CheckoutResponse, include_in_schema=False)
async def create_session_legacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    """
    Legacy endpoint kept for backward compatibility.
    """
    response = await _create_session(
        current_user=current_user,
        db=db,
        request_payload=CreateSessionRequest(),
    )
    return CheckoutResponse(
        checkout_url=response.checkout_url,
        session_id=response.session_id,
        provider=response.provider,
    )


async def _process_verified_webhook_event(
    event: VerifiedWebhookEvent,
    signature: str | None,
    db: AsyncSession,
) -> WebhookResponse:
    result = await db.execute(
        select(Payment).where(Payment.provider_event_id == event.provider_event_id)
    )
    payment = result.scalar_one_or_none()
    if payment and payment.processed_at is not None:
        return WebhookResponse(status="success", idempotent=True)

    reference_payment = await _resolve_reference_payment(event=event, db=db)

    if payment is None:
        payment = Payment(
            provider=event.provider,
            provider_event_id=event.provider_event_id,
            provider_session_id=event.session_id,
            provider_payment_id=event.payment_id,
            event_type=event.event_type,
            status="processing",
            amount_cents=event.amount_cents,
            currency=event.currency,
            signature=signature,
            raw_payload=event.raw_payload,
        )
        db.add(payment)
    else:
        payment.provider_session_id = event.session_id or payment.provider_session_id
        payment.provider_payment_id = event.payment_id or payment.provider_payment_id
        payment.event_type = event.event_type
        payment.amount_cents = event.amount_cents or payment.amount_cents
        payment.currency = event.currency or payment.currency
        payment.signature = signature
        payment.raw_payload = event.raw_payload
        payment.status = "processing"

    if reference_payment is not None:
        if payment.amount_cents is None:
            payment.amount_cents = reference_payment.amount_cents
        if payment.currency is None:
            payment.currency = reference_payment.currency

    user_id = await _resolve_webhook_user_id(event, db)
    if user_id is None and reference_payment is not None:
        user_id = _normalize_uuid(reference_payment.user_id)
    if user_id is not None:
        payment.user_id = user_id

    now = utc_now()

    if event.is_success:
        if reference_payment is not None and not _amount_matches_reference(
            event_amount=event.amount_cents,
            reference_amount=reference_payment.amount_cents,
        ):
            payment.status = "failed"
            payment.processed_at = now
            await db.commit()
            logger.error(
                "TSPay webhook amount mismatch. event_id=%s event_amount=%s expected_amount=%s",
                event.provider_event_id,
                event.amount_cents,
                reference_payment.amount_cents,
            )
            return WebhookResponse(status="ignored")

        if await _has_settled_success_for_transaction(event=event, db=db):
            payment.status = "ignored"
            payment.processed_at = now
            await db.commit()
            return WebhookResponse(status="success", idempotent=True)

        if user_id is None:
            payment.status = "failed"
            payment.processed_at = now
            await db.commit()
            logger.error(
                "TSPay webhook success event missing resolvable user_id. event_id=%s",
                event.provider_event_id,
            )
            return WebhookResponse(status="ignored")

        plan_code = _normalize_plan_code(str(event.metadata.get("plan")) if event.metadata.get("plan") is not None else None)
        duration_days = _parse_positive_int(
            event.metadata.get("duration_days"),
            default=DEFAULT_PLAN_DURATION_DAYS,
            minimum=1,
            maximum=3650,
        )
        await _activate_subscription(
            user_id=user_id,
            db=db,
            provider=event.provider,
            provider_subscription_id=event.session_id or event.payment_id,
            plan_code=plan_code,
            duration_days=duration_days,
        )
        await _record_promo_redemption(event=event, payment=payment, user_id=user_id, db=db)
        await _emit_upgrade_success_event(user_id=user_id, db=db, payment=payment, event=event)
        payment.status = "succeeded"
    elif event.is_failure:
        payment.status = "failed"
    else:
        payment.status = "ignored"

    payment.processed_at = now

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        logger.warning("Payment webhook idempotency race resolved for %s", event.provider_event_id)

        result = await db.execute(
            select(Payment).where(Payment.provider_event_id == event.provider_event_id)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            return WebhookResponse(status="success", idempotent=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Webhook event conflict.",
        ) from exc

    return WebhookResponse(status="success")


@router.post("/api/payments/webhook", response_model=WebhookResponse)
async def tspay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WebhookResponse:
    """
    Process TSPay webhook events with signature verification and idempotency.
    """
    payload = await request.body()
    signature = _extract_signature(request)

    try:
        event = PAYMENT_PROVIDER.verify_webhook(payload=payload, signature_header=signature)
    except PaymentReplayError as exc:
        logger.warning("TSPay webhook replay/timestamp issue: %s", exc)
        return WebhookResponse(status="ignored")
    except PaymentSignatureError as exc:
        logger.warning("TSPay webhook signature issue: %s", exc)
        return WebhookResponse(status="ignored")
    except PaymentProviderError as exc:
        logger.warning("TSPay webhook payload issue: %s", exc)
        return WebhookResponse(status="ignored")

    return await _process_verified_webhook_event(event=event, signature=signature, db=db)


@router.post("/payments/webhook", response_model=WebhookResponse, include_in_schema=False)
async def tspay_webhook_legacy(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WebhookResponse:
    """
    Legacy webhook endpoint retained for backward compatibility.
    """
    return await tspay_webhook(request=request, db=db)
