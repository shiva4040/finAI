from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class VendorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=150)
    address: Optional[str] = None
    tax_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    tax_number: Optional[str] = None
    notes: Optional[str] = None


class VendorResponse(VendorBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class VendorSummary(BaseModel):
    vendor_id: str
    total_spending: Decimal
    expense_count: int
