from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CSVPreviewResponse(BaseModel):
    delimiter: str
    encoding: str
    headers: List[str]
    sample_rows: List[List[str]]
    total_rows: int


class CSVColumnMapping(BaseModel):
    date: str = Field(..., description="Column header for transaction date")
    description: str = Field(..., description="Column header for description")
    amount: str = Field(..., description="Column header for monetary amount")
    type: Optional[str] = Field(None, description="Column header for type (income/expense)")
    category: Optional[str] = Field(None, description="Column header for category")
    payment_method: Optional[str] = Field(None, description="Column header for payment method")
    reference: Optional[str] = Field(None, description="Column header for reference")
    default_type: Optional[str] = Field("expense", description="Default type if not specified per row")
    default_currency: Optional[str] = Field("INR", description="Default currency code")


class CSVImportRowError(BaseModel):
    row_number: int
    reason: str
    raw_data: Optional[Dict[str, Any]] = None


class CSVImportResponse(BaseModel):
    success: bool
    total_rows: int
    imported_count: int
    duplicates_skipped: int
    rejected_count: int
    errors: List[CSVImportRowError] = []
    imported_ids: List[str] = []
