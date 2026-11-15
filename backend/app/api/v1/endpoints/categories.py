from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.auth import GenericMessageResponse
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    req: CategoryCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CategoryService(session)
    category = await service.create_category(user_id=current_user.id, data=req)
    return CategoryResponse.model_validate(category)


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    q: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CategoryService(session)
    cats = await service.list_categories(user_id=current_user.id, category_type=type, search=q)
    return [CategoryResponse.model_validate(c) for c in cats]


@router.get("/{id}", response_model=CategoryResponse)
async def get_category(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CategoryService(session)
    category = await service.get_category(category_id=id, user_id=current_user.id)
    return CategoryResponse.model_validate(category)


@router.patch("/{id}", response_model=CategoryResponse)
async def update_category(
    id: str,
    req: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CategoryService(session)
    updated = await service.update_category(category_id=id, user_id=current_user.id, data=req)
    return CategoryResponse.model_validate(updated)


@router.delete("/{id}", response_model=GenericMessageResponse)
async def delete_category(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = CategoryService(session)
    await service.delete_category(category_id=id, user_id=current_user.id)
    return GenericMessageResponse(message="Category deleted successfully")
