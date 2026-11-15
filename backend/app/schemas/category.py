from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(income|expense)$")
    icon: Optional[str] = "folder"
    color: Optional[str] = "#6366f1"


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    is_system: bool
    created_at: datetime
    updated_at: datetime
