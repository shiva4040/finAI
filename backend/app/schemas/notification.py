from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    type: str
    title: str
    message: str
    is_read: bool
    reference_id: Optional[str] = None
    created_at: datetime


class PaginatedNotificationResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
