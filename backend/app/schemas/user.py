from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserProfileResponse(UserResponse):
    currency: Optional[str] = "INR"
    theme: Optional[str] = "dark"
    language: Optional[str] = "en"
