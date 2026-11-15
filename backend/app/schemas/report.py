from typing import Optional, List, Dict, Any
from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class ReportHeader(BaseModel):
    title: str
    generated_at: str
    currency: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    filters: Dict[str, Any] = {}


class ReportSummary(BaseModel):
    total_records: int
    metrics: Dict[str, Any]


class GenericReportResponse(BaseModel):
    header: ReportHeader
    summary: ReportSummary
    data: List[Dict[str, Any]]
