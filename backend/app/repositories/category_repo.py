from typing import List, Optional
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.transaction import Transaction

DEFAULT_SYSTEM_CATEGORIES = [
    # Income
    {"name": "Salary", "type": "income", "icon": "briefcase", "color": "#10b981"},
    {"name": "Freelance", "type": "income", "icon": "laptop", "color": "#06b6d4"},
    {"name": "Consulting", "type": "income", "icon": "users", "color": "#3b82f6"},
    {"name": "Investment", "type": "income", "icon": "trending-up", "color": "#8b5cf6"},
    {"name": "Other Income", "type": "income", "icon": "plus-circle", "color": "#14b8a6"},
    # Expense
    {"name": "Office & Workspace", "type": "expense", "icon": "building", "color": "#f59e0b"},
    {"name": "Travel & Commute", "type": "expense", "icon": "car", "color": "#ef4444"},
    {"name": "Software & Subscriptions", "type": "expense", "icon": "code", "color": "#6366f1"},
    {"name": "Marketing & Advertising", "type": "expense", "icon": "megaphone", "color": "#ec4899"},
    {"name": "Utilities & Bills", "type": "expense", "icon": "zap", "color": "#eab308"},
    {"name": "Supplies & Equipment", "type": "expense", "icon": "package", "color": "#84cc16"},
    {"name": "Food & Dining", "type": "expense", "icon": "coffee", "color": "#f97316"},
    {"name": "Taxes & Compliance", "type": "expense", "icon": "file-text", "color": "#64748b"},
    {"name": "Miscellaneous", "type": "expense", "icon": "more-horizontal", "color": "#94a3b8"},
]


class CategoryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def ensure_system_categories(self) -> None:
        """Seeds standard system categories if they do not exist."""
        stmt = select(func.count()).select_from(Category).where(Category.is_system == True)
        result = await self.session.execute(stmt)
        count = result.scalar() or 0
        if count == 0:
            for item in DEFAULT_SYSTEM_CATEGORIES:
                cat = Category(
                    user_id=None,
                    name=item["name"],
                    type=item["type"],
                    icon=item["icon"],
                    color=item["color"],
                    is_system=True
                )
                self.session.add(cat)
            await self.session.flush()

    async def list_for_user(
        self,
        user_id: str,
        category_type: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Category]:
        # Always ensure system categories are present
        await self.ensure_system_categories()

        conditions = [
            or_(Category.user_id == user_id, Category.is_system == True)
        ]
        if category_type:
            conditions.append(Category.type == category_type)
        if search:
            conditions.append(Category.name.ilike(f"%{search.strip()}%"))

        stmt = select(Category).where(and_(*conditions)).order_by(Category.is_system.desc(), Category.name.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, category_id: str, user_id: str) -> Optional[Category]:
        stmt = select(Category).where(
            Category.id == category_id,
            or_(Category.user_id == user_id, Category.is_system == True)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_user_category_by_name(self, user_id: str, name: str, category_type: str) -> Optional[Category]:
        stmt = select(Category).where(
            or_(Category.user_id == user_id, Category.is_system == True),
            func.lower(Category.name) == name.strip().lower(),
            Category.type == category_type
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(
        self,
        user_id: str,
        name: str,
        category_type: str,
        icon: str = "folder",
        color: str = "#6366f1"
    ) -> Category:
        category = Category(
            user_id=user_id,
            name=name.strip(),
            type=category_type,
            icon=icon,
            color=color,
            is_system=False
        )
        self.session.add(category)
        await self.session.flush()
        return category

    async def update(self, category: Category, **kwargs) -> Category:
        for k, v in kwargs.items():
            if hasattr(category, k) and v is not None:
                setattr(category, k, v)
        await self.session.flush()
        return category

    async def count_transactions_for_category(self, category_id: str) -> int:
        stmt = select(func.count()).select_from(Transaction).where(
            Transaction.category_id == category_id,
            Transaction.is_deleted == False
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def delete(self, category: Category) -> None:
        await self.session.delete(category)
        await self.session.flush()
