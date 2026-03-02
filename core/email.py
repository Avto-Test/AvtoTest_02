"""
AUTOTEST Email Utility
Production-ready SMTP email sender for verification codes
"""

import smtplib
import logging
from email.message import EmailMessage

from core.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(to_email: str, code: str) -> bool:
    """
    Send verification code email using SMTP with TLS.
    
    Args:
        to_email: Recipient email address
        code: Verification code to send
    
    Returns:
        True if email sent successfully, False otherwise
    """
    subject = "AUTOTEST – Email Verification Code"
    body = f"Your verification code is: {code}\nThis code expires in 15 minutes."
    
    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    
    try:
        # Use SMTP_SSL for port 465, or starttls for port 587
        if settings.EMAIL_PORT == 465:
            with smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                if settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD:
                    server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                server.starttls()
                if settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD:
                    server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
                server.send_message(msg)
        
        logger.info(f"Verification email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {str(e)}")
        # Log the full stack trace for debugging
        logger.exception("SMTP Error Details:")
        return False

