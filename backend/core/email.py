"""
AUTOTEST Email Utility
Resend API helpers for verification and password reset flows.
"""

import logging
import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from typing import Any

import resend

from core.config import settings

logger = logging.getLogger(__name__)


def _get_email_from() -> str:
    return (
        settings.EMAIL_FROM
        or os.getenv("EMAIL_FROM")
        or "AUTOTEST <onboarding@resend.dev>"
    ).strip()


def _get_resend_api_key() -> str:
    return (
        settings.RESEND_API_KEY
        or settings.RESEND_KEY
        or os.getenv("RESEND_API_KEY")
        or os.getenv("RESEND_KEY")
        or ""
    ).strip()


def _get_email_timeout_seconds() -> float:
    try:
        timeout = float(settings.EMAIL_TIMEOUT_SECONDS or 0)
    except Exception:
        timeout = 0
    return max(timeout, 3.0)


def _send_via_resend(params: dict[str, Any]) -> Any:
    return resend.Emails.send(params)


def send_email(to_email: str, subject: str, html: str) -> bool:
    api_key = _get_resend_api_key()
    if not api_key:
        logger.error("RESEND_API_KEY is not configured.")
        return False

    params = {
        "from": _get_email_from(),
        "to": [to_email],
        "subject": subject,
        "html": html,
    }

    timeout_seconds = _get_email_timeout_seconds()
    try:
        resend.api_key = api_key
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_send_via_resend, params)
            future.result(timeout=timeout_seconds)

        logger.info("Email sent via Resend to %s", to_email)
        return True
    except FutureTimeoutError:
        logger.exception(
            "Resend email timeout after %.1fs for recipient=%s",
            timeout_seconds,
            to_email,
        )
        return False
    except Exception:
        logger.exception("Resend email error for recipient=%s", to_email)
        return False


def send_verification_email(to_email: str, code: str) -> bool:
    html = f"""
    <h2>AUTOTEST Email Verification</h2>
    <p>Your verification code:</p>
    <h1>{code}</h1>
    <p>This code expires in 15 minutes.</p>
    """
    return send_email(
        to_email,
        "AUTOTEST Email Verification",
        html,
    )


def send_password_reset_email(to_email: str, code: str) -> bool:
    html = f"""
    <h2>Password Reset</h2>
    <p>Your reset code:</p>
    <h1>{code}</h1>
    <p>This code expires in 15 minutes.</p>
    """
    return send_email(
        to_email,
        "AUTOTEST Password Reset",
        html,
    )
