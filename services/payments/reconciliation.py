"""
Background reconciliation for pending payments.
Ensures premium activates even if webhooks fail.
"""

import asyncio
from datetime import timedelta
from typing import NoReturn

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from database.session import async_session_maker
from models.payment import Payment
from models.subscription import Subscription
from models.analytics_event import AnalyticsEvent
from services.payments.tspay import TSPayProvider
from services.payments.types import PaymentProviderError, utc_now
from services.subscriptions.lifecycle import _activate_subscription
import uuid

logger = get_logger(__name__)
PAYMENT_PROVIDER = TSPayProvider()

async def reconcile_pending_payments() -> None:
    """Finds old pending payments and syncs status with TsPay."""
    now = utc_now()
    threshold = now - timedelta(minutes=2)
    
    try:
        async with async_session_maker() as db:
            result = await db.execute(
                select(Payment).where(
                    and_(
                        Payment.status == "pending",
                        Payment.created_at < threshold,
                        Payment.provider == PAYMENT_PROVIDER.provider_name
                    )
                ).limit(50)
            )
            payments = result.scalars().all()
            
            if not payments:
                return

            logger.info(f"Reconciliation: Found {len(payments)} pending payments to check.")
            
            for payment in payments:
                if not payment.provider_session_id and not payment.provider_payment_id:
                    continue
                    
                cheque_id = payment.provider_payment_id or payment.provider_session_id
                
                try:
                    provider_status = await PAYMENT_PROVIDER.get_transaction_status(cheque_id)
                except PaymentProviderError as e:
                    logger.warning(f"Reconciliation check failed for {cheque_id}: {e}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error during reconciliation check for {cheque_id}: {e}")
                    continue
                    
                pay_status = (provider_status.pay_status or "").strip().lower()
                
                # Check match amount and currency if we successfully talk to provider
                # Replicate the same validation as the manual verification endpoint
                provider_amount = provider_status.amount
                
                if pay_status in {"success", "paid", "succeeded"}:
                    if provider_amount is not None and provider_amount != payment.amount_cents:
                        logger.error(
                            "CRITICAL: TSPay transaction %s amount mismatch during reconciliation. Expected: %s, Got: %s",
                            cheque_id,
                            payment.amount_cents,
                            provider_amount,
                        )
                        payment.status = "suspicious"
                        payment.processed_at = utc_now()
                        await db.commit()
                        continue
                        
                    plan_info = payment.raw_payload.get("plan", {}) if isinstance(payment.raw_payload, dict) else {}
                    plan_code = plan_info.get("code", "premium")
                    try:
                        duration_days = int(plan_info.get("duration_days", 30))
                    except (ValueError, TypeError):
                        duration_days = 30
                        
                    provider_sub_id = provider_status.transaction_id or provider_status.cheque_id
                    
                    if payment.user_id:
                        result_sub = await db.execute(select(Subscription).where(Subscription.user_id == payment.user_id))
                        existing_sub = result_sub.scalar_one_or_none()
                        
                        if not existing_sub or existing_sub.provider_subscription_id != provider_sub_id:
                            await _activate_subscription(
                                user_id=payment.user_id,
                                db=db,
                                provider=PAYMENT_PROVIDER.provider_name,
                                provider_subscription_id=provider_sub_id,
                                plan_code=plan_code,
                                duration_days=duration_days,
                                payment=payment,
                            )
                            
                            db.add(
                                AnalyticsEvent(
                                    user_id=payment.user_id,
                                    event_name="upgrade_success",
                                    metadata_json={
                                        "provider": payment.provider,
                                        "payment_id": payment.provider_payment_id,
                                        "session_id": payment.provider_session_id,
                                        "provider_event_id": f"reconciliation_{uuid.uuid4()}",
                                        "event_type": "reconciliation_sync",
                                        "amount_cents": payment.amount_cents,
                                        "currency": payment.currency,
                                        "plan": plan_code,
                                        "source": "reconciliation_job",
                                    },
                                )
                            )
                    
                    payment.status = "succeeded"
                    payment.processed_at = utc_now()
                    await db.commit()
                    logger.info(f"Reconciliation: Successfully activated {cheque_id}")
                    
                elif pay_status in {"canceled", "cancelled", "failed", "error"}:
                    payment.status = "failed"
                    payment.processed_at = utc_now()
                    await db.commit()
                    logger.info(f"Reconciliation: Marked {cheque_id} as failed.")
                    
    except Exception as e:
        logger.error(f"Reconciliation job failed: {e}")

async def start_reconciliation_loop() -> NoReturn:
    """Runs the reconciliation job periodically. Never crashes."""
    logger.info("Starting background payment reconciliation loop.")
    while True:
        try:
            await asyncio.sleep(60 * 5) # Every 5 minutes
            await reconcile_pending_payments()
        except asyncio.CancelledError:
            logger.info("Reconciliation loop stopped.")
            break
        except Exception as e:
            logger.error(f"Error in reconciliation loop: {e}")
            await asyncio.sleep(60) # Backoff
