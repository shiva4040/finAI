from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    PaginatedInvoiceResponse,
)
from app.schemas.payment import PaymentResponse
from app.schemas.auth import GenericMessageResponse
from app.services.invoice_service import InvoiceService
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    req: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = InvoiceService(session)
    invoice = await service.create_invoice(user_id=current_user.id, data=req)
    return InvoiceResponse.model_validate(invoice)


@router.get("", response_model=PaginatedInvoiceResponse)
async def list_invoices(
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = InvoiceService(session)
    result = await service.list_invoices(
        user_id=current_user.id,
        customer_id=customer_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        page_size=page_size
    )
    return PaginatedInvoiceResponse(
        items=[InvoiceResponse.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"]
    )


@router.get("/{id}", response_model=InvoiceResponse)
async def get_invoice(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = InvoiceService(session)
    invoice = await service.get_invoice(invoice_id=id, user_id=current_user.id)
    return InvoiceResponse.model_validate(invoice)


@router.post("/{id}/send", response_model=InvoiceResponse)
async def send_invoice(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = InvoiceService(session)
    updated = await service.send_invoice(invoice_id=id, user_id=current_user.id)
    return InvoiceResponse.model_validate(updated)


@router.post("/{id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = InvoiceService(session)
    cancelled = await service.cancel_invoice(invoice_id=id, user_id=current_user.id)
    return InvoiceResponse.model_validate(cancelled)


@router.delete("/{id}", response_model=GenericMessageResponse)
async def delete_invoice(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = InvoiceService(session)
    await service.delete_invoice(invoice_id=id, user_id=current_user.id)
    return GenericMessageResponse(message="Invoice deleted successfully")


@router.get("/{id}/payments", response_model=List[PaymentResponse])
async def get_invoice_payments(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    pay_service = PaymentService(session)
    result = await pay_service.list_payments(user_id=current_user.id, invoice_id=id, page_size=100)
    return [PaymentResponse.model_validate(p) for p in result["items"]]


@router.get("/{id}/pdf")
async def download_invoice_pdf(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = InvoiceService(session)
    invoice = await service.get_invoice(invoice_id=id, user_id=current_user.id)
    pdf_bytes = await service.generate_pdf(invoice_id=id, user_id=current_user.id)
    
    filename = f"{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
