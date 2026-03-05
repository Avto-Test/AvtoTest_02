"""
AUTOTEST Email Utility
SMTP helpers for verification and password reset flows.
"""

import logging
import smtplib
from email.message import EmailMessage

from core.config import settings

logger = logging.getLogger(__name__)


def _build_message(subject: str, to_email: str, text: str) -> EmailMessage:
    msg = EmailMessage()
    msg.set_content(text)
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM or settings.EMAIL_USERNAME
    msg["To"] = to_email
    return msg


def _send_message(msg: EmailMessage) -> bool:
    if not settings.EMAIL_HOST:
        logger.error("EMAIL_HOST is not configured.")
        return False

    if not settings.EMAIL_FROM and not settings.EMAIL_USERNAME:
        logger.error("EMAIL_FROM/EMAIL_USERNAME is not configured.")
        return False

    if "gmail.com" in settings.EMAIL_HOST and (not settings.EMAIL_USERNAME or not settings.EMAIL_PASSWORD):
        logger.error("Gmail SMTP requires EMAIL_USERNAME and EMAIL_PASSWORD.")
        return False

    timeout_seconds = max(float(settings.EMAIL_TIMEOUT_SECONDS or 0), 3.0)
    try:
        if settings.EMAIL_PORT == 465:
            with smtplib.SMTP_SSL(
                settings.EMAIL_HOST,
                settings.EMAIL_PORT,
                timeout=timeout_seconds,
            ) as server:
                if settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD:
                    server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(
                settings.EMAIL_HOST,
                settings.EMAIL_PORT,
                timeout=timeout_seconds,
            ) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                if settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD:
                    server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
                server.send_message(msg)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", msg.get("To"), exc)
        logger.exception("SMTP Error Details:")
        return False


def send_verification_email(to_email: str, code: str) -> bool:
    subject = "AUTOTEST - Email tasdiqlash kodi"
    body = (
        "Salom!\n\n"
        f"Sizning AUTOTEST tasdiqlash kodingiz: {code}\n"
        "Kod 15 daqiqa davomida amal qiladi.\n\n"
        "Agar bu so'rovni siz yubormagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring."
    )
    return _send_message(_build_message(subject, to_email, body))


def send_password_reset_email(to_email: str, code: str) -> bool:
    subject = "AUTOTEST - Parolni tiklash kodi"
    body = (
        "Salom!\n\n"
        f"Sizning parolni tiklash kodingiz: {code}\n"
        "Kod 15 daqiqa davomida amal qiladi.\n\n"
        "Agar bu so'rovni siz yubormagan bo'lsangiz, xavfsizlik uchun parolingizni tekshiring."
    )
    return _send_message(_build_message(subject, to_email, body))
