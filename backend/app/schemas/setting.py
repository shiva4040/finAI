from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    currency: str
    date_format: str
    language: str
    theme: str
    notification_preferences: str
    created_at: datetime
    updated_at: datetime


class SettingUpdate(BaseModel):
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    date_format: Optional[str] = Field(None, max_length=20)
    language: Optional[str] = Field(None, max_length=10)
    theme: Optional[str] = Field(None, pattern="^(dark|light|system)$")
    notification_preferences: Optional[str] = None
