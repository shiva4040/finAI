from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerSummary,
)
from app.schemas.invoice import InvoiceResponse
from app.schemas.payment import PaymentResponse
from app.schemas.auth import GenericMessageResponse
from app.services.customer_service import CustomerService
from app.services.invoice_service import InvoiceService
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    req: CustomerCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CustomerService(session)
    cust = await service.create_customer(user_id=current_user.id, data=req)
    return CustomerResponse.model_validate(cust)


@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CustomerService(session)
    result = await service.list_customers(user_id=current_user.id, search=search, page=page, page_size=page_size)
    return [CustomerResponse.model_validate(c) for c in result["items"]]


@router.get("/{id}", response_model=CustomerResponse)
async def get_customer(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CustomerService(session)
    cust = await service.get_customer(customer_id=id, user_id=current_user.id)
    return CustomerResponse.model_validate(cust)


@router.patch("/{id}", response_model=CustomerResponse)
async def update_customer(
    id: str,
    req: CustomerUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CustomerService(session)
    updated = await service.update_customer(customer_id=id, user_id=current_user.id, data=req)
    return CustomerResponse.model_validate(updated)


@router.delete("/{id}", response_model=GenericMessageResponse)
async def delete_customer(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CustomerService(session)
    await service.delete_customer(customer_id=id, user_id=current_user.id)
    return GenericMessageResponse(message="Customer deleted successfully")


@router.get("/{id}/invoices", response_model=List[InvoiceResponse])
async def get_customer_invoices(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    inv_service = InvoiceService(session)
    result = await inv_service.list_invoices(user_id=current_user.id, customer_id=id, page_size=100)
    return [InvoiceResponse.model_validate(i) for i in result["items"]]


@router.get("/{id}/summary", response_model=CustomerSummary)
async def get_customer_summary(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CustomerService(session)
    return await service.get_summary(customer_id=id, user_id=current_user.id)
