from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.report import GenericReportResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/{report_type}", response_model=GenericReportResponse)
async def get_report(
    report_type: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = ReportService(session)
    return await service.generate_json_report(
        report_type=report_type,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        customer_id=customer_id,
        currency=currency
    )


@router.get("/{report_type}/export/csv")
async def export_report_csv(
    report_type: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = ReportService(session)
    csv_bytes = await service.generate_csv_export(
        report_type=report_type,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        customer_id=customer_id,
        currency=currency
    )
    filename = f"finai_{report_type}_report.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{report_type}/export/pdf")
async def export_report_pdf(
    report_type: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    currency: Optional[str] = Query("INR"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = ReportService(session)
    pdf_bytes = await service.generate_pdf_export(
        report_type=report_type,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        customer_id=customer_id,
        currency=currency
    )
    filename = f"finai_{report_type}_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
