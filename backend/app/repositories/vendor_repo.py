from typing import List, Optional, Tuple, Dict, Any
from decimal import Decimal
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vendor import Vendor
from app.models.transaction import Transaction
from app.utils.money import money_decimal


class VendorRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Vendor:
        vendor = Vendor(**kwargs)
        self.session.add(vendor)
        await self.session.flush()
        return vendor

    async def get_by_id(self, vendor_id: str, user_id: str) -> Optional[Vendor]:
        stmt = select(Vendor).where(
            Vendor.id == vendor_id,
            Vendor.user_id == user_id,
            Vendor.is_archived == False
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_paginated(
        self,
        user_id: str,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Vendor], int]:
        conditions = [
            Vendor.user_id == user_id,
            Vendor.is_archived == False
        ]
        if search:
            s = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Vendor.name.ilike(s),
                    Vendor.email.ilike(s),
                    Vendor.company.ilike(s),
                    Vendor.phone.ilike(s)
                )
            )

        count_stmt = select(func.count()).select_from(Vendor).where(and_(*conditions))
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Vendor)
            .where(and_(*conditions))
            .order_by(Vendor.name.asc())
            .offset(offset)
            .limit(page_size)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all()), total

    async def update(self, vendor: Vendor, **kwargs) -> Vendor:
        for k, v in kwargs.items():
            if hasattr(vendor, k) and v is not None:
                setattr(vendor, k, v)
        await self.session.flush()
        return vendor

    async def archive(self, vendor: Vendor) -> None:
        vendor.is_archived = True
        await self.session.flush()

    async def get_summary(self, vendor_id: str, user_id: str) -> Dict[str, Any]:
        vendor = await self.get_by_id(vendor_id, user_id)
        if not vendor:
            return {"vendor_id": vendor_id, "total_spending": Decimal("0.00"), "expense_count": 0}

        # Match expenses where vendor name or company appears in description, reference or notes
        filters = [Transaction.description.ilike(f"%{vendor.name.strip()}%")]
        if vendor.company:
            filters.append(Transaction.description.ilike(f"%{vendor.company.strip()}%"))
        filters.append(Transaction.notes.ilike(f"%{vendor.name.strip()}%"))

        stmt = select(
            func.coalesce(func.sum(Transaction.amount), 0).label("total_spending"),
            func.count(Transaction.id).label("expense_count")
        ).where(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.is_deleted == False,
            or_(*filters)
        )
        res = await self.session.execute(stmt)
        row = res.one()

        return {
            "vendor_id": vendor_id,
            "total_spending": money_decimal(row.total_spending),
            "expense_count": row.expense_count
        }
