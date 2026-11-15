from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    period: str = Query("this_month", pattern="^(today|this_week|this_month|last_month|this_year|custom)$"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = DashboardService(session)
    return await service.get_summary(
        user_id=current_user.id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        currency=currency
    )
