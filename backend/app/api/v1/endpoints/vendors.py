from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.vendor import (
    VendorCreate,
    VendorUpdate,
    VendorResponse,
    VendorSummary,
)
from app.schemas.transaction import TransactionResponse
from app.schemas.auth import GenericMessageResponse
from app.services.vendor_service import VendorService
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    req: VendorCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = VendorService(session)
    vendor = await service.create_vendor(user_id=current_user.id, data=req)
    return VendorResponse.model_validate(vendor)


@router.get("", response_model=List[VendorResponse])
async def list_vendors(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = VendorService(session)
    result = await service.list_vendors(user_id=current_user.id, search=search, page=page, page_size=page_size)
    return [VendorResponse.model_validate(v) for v in result["items"]]


@router.get("/{id}", response_model=VendorResponse)
async def get_vendor(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = VendorService(session)
    vendor = await service.get_vendor(vendor_id=id, user_id=current_user.id)
    return VendorResponse.model_validate(vendor)


@router.patch("/{id}", response_model=VendorResponse)
async def update_vendor(
    id: str,
    req: VendorUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = VendorService(session)
    updated = await service.update_vendor(vendor_id=id, user_id=current_user.id, data=req)
    return VendorResponse.model_validate(updated)


@router.delete("/{id}", response_model=GenericMessageResponse)
async def delete_vendor(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = VendorService(session)
    await service.delete_vendor(vendor_id=id, user_id=current_user.id)
    return GenericMessageResponse(message="Vendor deleted successfully")


@router.get("/{id}/expenses", response_model=List[TransactionResponse])
async def get_vendor_expenses(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    v_service = VendorService(session)
    vendor = await v_service.get_vendor(vendor_id=id, user_id=current_user.id)
    tx_service = TransactionService(session)
    result = await tx_service.list_transactions(user_id=current_user.id, tx_type="expense", search=vendor.name, page_size=50)
    return [TransactionResponse.model_validate(t) for t in result["items"]]


@router.get("/{id}/summary", response_model=VendorSummary)
async def get_vendor_summary(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = VendorService(session)
    return await service.get_summary(vendor_id=id, user_id=current_user.id)
