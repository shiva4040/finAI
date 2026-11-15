from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.repositories.category_repo import CategoryRepository
from app.core.exceptions import (
    NotFoundException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
)
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = CategoryRepository(session)

    async def list_categories(
        self,
        user_id: str,
        category_type: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Category]:
        return await self.repo.list_for_user(user_id=user_id, category_type=category_type, search=search)

    async def get_category(self, category_id: str, user_id: str) -> Category:
        category = await self.repo.get_by_id(category_id=category_id, user_id=user_id)
        if not category:
            raise NotFoundException("Category", category_id)
        return category

    async def create_category(self, user_id: str, data: CategoryCreate) -> Category:
        existing = await self.repo.get_user_category_by_name(
            user_id=user_id,
            name=data.name,
            category_type=data.type
        )
        if existing and existing.user_id == user_id:
            raise ConflictException(f"A category named '{data.name}' already exists for {data.type}")

        cat = await self.repo.create(
            user_id=user_id,
            name=data.name,
            category_type=data.type,
            icon=data.icon or "folder",
            color=data.color or "#6366f1"
        )
        await self.session.commit()
        await self.session.refresh(cat)
        return cat

    async def update_category(self, category_id: str, user_id: str, data: CategoryUpdate) -> Category:
        category = await self.get_category(category_id, user_id)
        if category.is_system:
            raise ForbiddenException("System categories cannot be modified")

        if category.user_id != user_id:
            raise ForbiddenException("You do not have permission to modify this category")

        if data.name and data.name.lower() != category.name.lower():
            existing = await self.repo.get_user_category_by_name(
                user_id=user_id,
                name=data.name,
                category_type=category.type
            )
            if existing and existing.id != category.id:
                raise ConflictException(f"A category named '{data.name}' already exists")

        updated = await self.repo.update(
            category,
            name=data.name,
            icon=data.icon,
            color=data.color
        )
        await self.session.commit()
        await self.session.refresh(updated)
        return updated

    async def delete_category(self, category_id: str, user_id: str) -> None:
        category = await self.get_category(category_id, user_id)
        if category.is_system:
            raise ForbiddenException("System categories cannot be deleted")

        if category.user_id != user_id:
            raise ForbiddenException("You do not have permission to delete this category")

        # Check existing transactions
        count = await self.repo.count_transactions_for_category(category_id)
        if count > 0:
            raise BadRequestException(
                f"Cannot delete category '{category.name}' because it has {count} active transaction(s) associated with it."
            )

        await self.repo.delete(category)
        await self.session.commit()
