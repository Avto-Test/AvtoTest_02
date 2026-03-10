"""
AUTOTEST Auth Schemas
Pydantic models for authentication
"""

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    
    model_config = {
        "extra": "ignore",
        "str_strip_whitespace": True,
    }


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    model_config = {
        "str_strip_whitespace": True,
    }


class Token(BaseModel):
    """Schema for access + refresh token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_token_expires_in: int
    refresh_token_expires_in: int


class VerifyEmail(BaseModel):
    """Schema for email verification."""
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

    model_config = {
        "str_strip_whitespace": True,
    }


class MessageResponse(BaseModel):
    """Schema for simple message response."""
    message: str


class ResendVerificationRequest(BaseModel):
    """Schema for resending email verification code."""
    email: EmailStr

    model_config = {
        "str_strip_whitespace": True,
    }


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting password reset code."""
    email: EmailStr

    model_config = {
        "str_strip_whitespace": True,
    }


class ResetPasswordRequest(BaseModel):
    """Schema for confirming password reset by code."""
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)

    model_config = {
        "str_strip_whitespace": True,
    }
