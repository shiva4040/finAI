from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.utils.money import money_decimal
from app.schemas.category import CategoryResponse


class TransactionBase(BaseModel):
    category_id: Optional[str] = None
    type: str = Field(..., pattern="^(income|expense)$")
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    currency: Optional[str] = Field("INR", min_length=3, max_length=3)
    description: str = Field(..., min_length=1, max_length=255)
    transaction_date: date
    payment_method: Optional[str] = Field("bank_transfer", min_length=1, max_length=50)
    reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        d = money_decimal(v)
        if d <= Decimal("0.00"):
            raise ValueError("Amount must be greater than zero")
        return d

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v):
        return v.upper() if v else "INR"


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v is not None:
            d = money_decimal(v)
            if d <= Decimal("0.00"):
                raise ValueError("Amount must be greater than zero")
            return d
        return v


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    source: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None


class PaginatedTransactionResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryBreakdownItem(BaseModel):
    category_id: Optional[str]
    category_name: str
    category_icon: Optional[str] = "folder"
    category_color: Optional[str] = "#6366f1"
    amount: Decimal
    percentage: Decimal
    transaction_count: int


class MonthlyTrendItem(BaseModel):
    month: int
    month_name: str
    amount: Decimal


class FinancialMetricSummary(BaseModel):
    currency: str = "INR"
    total: Decimal
    today: Decimal
    this_month: Decimal
    this_year: Decimal
    previous_month: Decimal
    month_over_month_change_pct: Decimal
    average_monthly: Optional[Decimal] = None
