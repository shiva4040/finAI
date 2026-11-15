from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.utils.money import money_decimal
from app.schemas.customer import CustomerResponse


class InvoiceItemBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    quantity: Decimal = Field(Decimal("1.0000"), gt=Decimal("0.0000"))
    unit_price: Decimal = Field(..., ge=Decimal("0.00"))
    tax_rate: Optional[Decimal] = Field(Decimal("0.0000"), ge=Decimal("0.0000"))
    discount_amount: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))

    @field_validator("quantity")
    @classmethod
    def val_qty(cls, v):
        return money_decimal(v, places=4)

    @field_validator("unit_price", "discount_amount")
    @classmethod
    def val_money(cls, v):
        return money_decimal(v, places=2)

    @field_validator("tax_rate")
    @classmethod
    def val_tax_rate(cls, v):
        return money_decimal(v, places=4)


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    tax_amount: Decimal
    total: Decimal


class InvoiceBase(BaseModel):
    customer_id: str
    invoice_number: Optional[str] = Field(None, max_length=50)
    issue_date: date
    due_date: date
    currency: Optional[str] = Field("INR", min_length=3, max_length=3)
    notes: Optional[str] = None
    discount_total: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = Field(..., min_length=1)


class InvoiceUpdate(BaseModel):
    customer_id: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    discount_total: Optional[Decimal] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    customer_id: str
    invoice_number: str
    issue_date: date
    due_date: date
    currency: str
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerResponse] = None
    items: List[InvoiceItemResponse] = []


class PaginatedInvoiceResponse(BaseModel):
    items: List[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
