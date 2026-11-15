from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.transaction import TransactionResponse, CategoryBreakdownItem
from app.schemas.invoice import InvoiceResponse
from app.schemas.payment import PaymentResponse


class CashFlowMonthItem(BaseModel):
    month: int
    month_name: str
    income: Decimal
    expense: Decimal
    net_cashflow: Decimal


class DashboardSummaryResponse(BaseModel):
    currency: str = "INR"
    period: str
    total_income: Decimal
    total_expenses: Decimal
    net_cash_flow: Decimal
    total_balance: Decimal
    outstanding_invoices_amount: Decimal
    overdue_invoices_amount: Decimal
    overdue_invoices_count: int

    monthly_cash_flow: List[CashFlowMonthItem]
    expense_breakdown: List[CategoryBreakdownItem]
    income_breakdown: List[CategoryBreakdownItem]

    recent_transactions: List[TransactionResponse]
    recent_invoices: List[InvoiceResponse]
    recent_payments: List[PaymentResponse]
