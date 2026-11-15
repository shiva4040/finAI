from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.utils.money import money_decimal


class PaymentCreate(BaseModel):
    invoice_id: str
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    payment_date: date
    payment_method: Optional[str] = Field("bank_transfer", min_length=1, max_length=50)
    reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def val_amt(cls, v):
        d = money_decimal(v)
        if d <= Decimal("0.00"):
            raise ValueError("Payment amount must be greater than zero")
        return d


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    invoice_id: str
    amount: Decimal
    currency: str
    payment_date: date
    payment_method: str
    reference: Optional[str]
    notes: Optional[str]
    is_reversed: bool
    created_at: datetime


class PaginatedPaymentResponse(BaseModel):
    items: List[PaymentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
