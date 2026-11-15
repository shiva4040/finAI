from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    currency: Optional[str] = "INR"


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    tools_called: List[Dict[str, Any]] = []
    created_at: datetime


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []


class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
