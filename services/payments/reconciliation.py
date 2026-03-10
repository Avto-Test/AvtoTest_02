"""
Compatibility layer for payment reconciliation.

The actual background processing logic lives in ``services.payments.payment_worker``.
This module keeps the previous public functions import-compatible for tests and
legacy callers while ensuring the web app no longer owns the worker lifecycle.
"""

from __future__ import annotations

from collections.abc import Callable

from core.logging import get_logger
from database.session import async_session_maker
from services.payments.payment_worker import PaymentWorker
from services.payments.tspay import TSPayProvider

logger = get_logger(__name__)
PAYMENT_PROVIDER = TSPayProvider()


def _create_payment_worker() -> PaymentWorker:
    return PaymentWorker(
        session_maker=async_session_maker,
        provider=PAYMENT_PROVIDER,
    )


async def reconcile_pending_payments() -> int:
    """
    Run a single reconciliation batch.

    Returns the number of payments processed in this batch.
    """

    worker = _create_payment_worker()
    return await worker.process_pending_payments()


async def start_reconciliation_loop() -> None:
    """
    Deprecated compatibility wrapper.

    The payment worker must be run by ``scripts/run_payment_worker.py`` or an
    external supervisor, not by the FastAPI web process.
    """

    logger.warning(
        "start_reconciliation_loop() is deprecated. "
        "Run scripts/run_payment_worker.py under a separate worker process."
    )
    worker = _create_payment_worker()
    await worker.run_forever()
