"""
AUTOTEST Email Utility
Simple SMTP email sender for verification codes
"""

import os
import smtplib
from email.mime.text import MIMEText

# SMTP configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@autotest.local")


def send_verification_email(to_email: str, code: str) -> bool:
    """
    Send verification code email.
    
    Args:
        to_email: Recipient email address
        code: Verification code to send
    
    Returns:
        True if email sent successfully, False otherwise
    """
    subject = "AUTOTEST - Email Verification Code"
    body = f"""Your AUTOTEST verification code is: {code}

This code will expire in 15 minutes.

If you did not request this code, please ignore this email.
"""
    
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USER and SMTP_PASSWORD:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
