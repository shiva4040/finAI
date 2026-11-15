from typing import Optional, List
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    PaginatedTransactionResponse,
    FinancialMetricSummary,
    CategoryBreakdownItem,
    MonthlyTrendItem,
)
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=PaginatedTransactionResponse)
async def list_expenses(
    category_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    min_amount: Optional[Decimal] = Query(None),
    max_amount: Optional[Decimal] = Query(None),
    currency: Optional[str] = Query("INR"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    result = await service.list_transactions(
        user_id=current_user.id,
        tx_type="expense",
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        currency=currency,
        search=search,
        page=page,
        page_size=page_size
    )
    return PaginatedTransactionResponse(
        items=[TransactionResponse.model_validate(item) for item in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"]
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    req: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    req.type = "expense"
    service = TransactionService(session)
    tx = await service.create_transaction(user_id=current_user.id, data=req)
    return TransactionResponse.model_validate(tx)


@router.get("/summary", response_model=FinancialMetricSummary)
async def get_expense_summary(
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    return await service.get_summary(user_id=current_user.id, tx_type="expense", currency=currency)


@router.get("/by-category", response_model=List[CategoryBreakdownItem])
async def get_expenses_by_category(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    return await service.get_by_category(
        user_id=current_user.id,
        tx_type="expense",
        start_date=start_date,
        end_date=end_date,
        currency=currency
    )


@router.get("/trends", response_model=List[MonthlyTrendItem])
async def get_expense_trends(
    year: Optional[int] = Query(None),
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    target_year = year or date.today().year
    service = TransactionService(session)
    return await service.get_trends(
        user_id=current_user.id,
        tx_type="expense",
        year=target_year,
        currency=currency
    )


@router.get("/largest", response_model=List[TransactionResponse])
async def get_largest_expenses(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(5, ge=1, le=50),
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    expenses = await service.get_largest_expenses(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        currency=currency
    )
    return [TransactionResponse.model_validate(e) for e in expenses]
