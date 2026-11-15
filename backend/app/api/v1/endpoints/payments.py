from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaginatedPaymentResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    req: PaymentCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = PaymentService(session)
    payment = await service.record_payment(user_id=current_user.id, data=req)
    return PaymentResponse.model_validate(payment)


@router.get("", response_model=PaginatedPaymentResponse)
async def list_payments(
    invoice_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = PaymentService(session)
    result = await service.list_payments(
        user_id=current_user.id,
        invoice_id=invoice_id,
        page=page,
        page_size=page_size
    )
    return PaginatedPaymentResponse(
        items=[PaymentResponse.model_validate(p) for p in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"]
    )


@router.get("/{id}", response_model=PaymentResponse)
async def get_payment(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = PaymentService(session)
    payment = await service.get_payment(payment_id=id, user_id=current_user.id)
    return PaymentResponse.model_validate(payment)


@router.post("/{id}/reverse", response_model=PaymentResponse)
async def reverse_payment(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = PaymentService(session)
    reversed_payment = await service.reverse_payment(payment_id=id, user_id=current_user.id)
    return PaymentResponse.model_validate(reversed_payment)
