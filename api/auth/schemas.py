"""
AUTOTEST Auth Schemas
Pydantic models for authentication
"""

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str
    
    model_config = {
        "extra": "ignore"
    }


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class VerifyEmail(BaseModel):
    """Schema for email verification."""
    email: EmailStr
    code: str


class MessageResponse(BaseModel):
    """Schema for simple message response."""
    message: str
