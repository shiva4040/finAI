import json
from typing import Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    PaginatedTransactionResponse,
)
from app.schemas.csv_import import (
    CSVPreviewResponse,
    CSVColumnMapping,
    CSVImportResponse,
)
from app.schemas.auth import GenericMessageResponse
from app.services.transaction_service import TransactionService
from app.services.csv_import_service import CSVImportService
from app.core.exceptions import ValidationException

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    req: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    tx = await service.create_transaction(user_id=current_user.id, data=req)
    return TransactionResponse.model_validate(tx)


@router.get("", response_model=PaginatedTransactionResponse)
async def list_transactions(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    category_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    min_amount: Optional[Decimal] = Query(None),
    max_amount: Optional[Decimal] = Query(None),
    payment_method: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("transaction_date", pattern="^(transaction_date|amount|created_at)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    result = await service.list_transactions(
        user_id=current_user.id,
        tx_type=type,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        payment_method=payment_method,
        currency=currency,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
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


@router.get("/{id}", response_model=TransactionResponse)
async def get_transaction(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    tx = await service.get_transaction(transaction_id=id, user_id=current_user.id)
    return TransactionResponse.model_validate(tx)


@router.patch("/{id}", response_model=TransactionResponse)
async def update_transaction(
    id: str,
    req: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    updated = await service.update_transaction(transaction_id=id, user_id=current_user.id, data=req)
    return TransactionResponse.model_validate(updated)


@router.delete("/{id}", response_model=GenericMessageResponse)
async def delete_transaction(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = TransactionService(session)
    await service.delete_transaction(transaction_id=id, user_id=current_user.id)
    return GenericMessageResponse(message="Transaction deleted successfully")


@router.post("/preview-csv", response_model=CSVPreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Parses and previews uploaded CSV headers, sample rows, and detected delimiter/encoding.
    """
    if not file.filename.lower().endswith((".csv", ".txt")):
        raise ValidationException("Uploaded file must have a .csv extension.")
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise ValidationException("File size exceeds 5MB limit.")
        
    service = CSVImportService(session)
    return service.preview_csv(contents)


@router.post("/import-csv", response_model=CSVImportResponse)
async def import_csv(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Executes transaction batch import with column mapping, decimal validation, and duplicate detection.
    """
    if not file.filename.lower().endswith((".csv", ".txt")):
        raise ValidationException("Uploaded file must have a .csv extension.")
        
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise ValidationException("File size exceeds 10MB limit.")
        
    service = CSVImportService(session)
    
    if mapping:
        try:
            mapping_dict = json.loads(mapping)
            col_mapping = CSVColumnMapping(**mapping_dict)
        except Exception as e:
            raise ValidationException(f"Invalid column mapping JSON: {str(e)}")
    else:
        # Default auto-mapping if not supplied
        preview = service.preview_csv(contents, max_rows=1)
        headers_lower = {h.lower(): h for h in preview.headers}
        
        date_col = next((headers_lower[k] for k in ["date", "transaction_date", "tx_date", "timestamp"] if k in headers_lower), preview.headers[0] if preview.headers else "date")
        desc_col = next((headers_lower[k] for k in ["description", "desc", "details", "memo", "narration"] if k in headers_lower), preview.headers[1] if len(preview.headers) > 1 else "description")
        amt_col = next((headers_lower[k] for k in ["amount", "amt", "total", "value"] if k in headers_lower), preview.headers[2] if len(preview.headers) > 2 else "amount")
        type_col = next((headers_lower[k] for k in ["type", "tx_type", "transaction_type", "dr_cr"] if k in headers_lower), None)
        cat_col = next((headers_lower[k] for k in ["category", "cat", "expense_type"] if k in headers_lower), None)
        
        col_mapping = CSVColumnMapping(
            date=date_col,
            description=desc_col,
            amount=amt_col,
            type=type_col,
            category=cat_col
        )
        
    return await service.import_transactions(
        user_id=current_user.id,
        file_bytes=contents,
        mapping=col_mapping
    )

