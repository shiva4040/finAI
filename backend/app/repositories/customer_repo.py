from typing import List, Optional, Tuple, Dict, Any
from datetime import date
from decimal import Decimal
from sqlalchemy import select, and_, or_, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.utils.money import money_decimal


class CustomerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Customer:
        customer = Customer(**kwargs)
        self.session.add(customer)
        await self.session.flush()
        return customer

    async def get_by_id(self, customer_id: str, user_id: str) -> Optional[Customer]:
        stmt = select(Customer).where(
            Customer.id == customer_id,
            Customer.user_id == user_id,
            Customer.is_archived == False
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_paginated(
        self,
        user_id: str,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Customer], int]:
        conditions = [
            Customer.user_id == user_id,
            Customer.is_archived == False
        ]
        if search:
            s = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Customer.name.ilike(s),
                    Customer.email.ilike(s),
                    Customer.company.ilike(s),
                    Customer.phone.ilike(s)
                )
            )

        count_stmt = select(func.count()).select_from(Customer).where(and_(*conditions))
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Customer)
            .where(and_(*conditions))
            .order_by(Customer.name.asc())
            .offset(offset)
            .limit(page_size)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all()), total

    async def update(self, customer: Customer, **kwargs) -> Customer:
        for k, v in kwargs.items():
            if hasattr(customer, k) and v is not None:
                setattr(customer, k, v)
        await self.session.flush()
        return customer

    async def count_invoices(self, customer_id: str, user_id: str) -> int:
        stmt = select(func.count()).select_from(Invoice).where(
            Invoice.customer_id == customer_id,
            Invoice.user_id == user_id
        )
        res = await self.session.execute(stmt)
        return res.scalar() or 0

    async def archive(self, customer: Customer) -> None:
        customer.is_archived = True
        await self.session.flush()

    async def get_summary(self, customer_id: str, user_id: str) -> Dict[str, Any]:
        today = date.today()
        # Invoices metrics
        stmt = select(
            func.coalesce(func.sum(Invoice.total), 0).label("total_invoiced"),
            func.coalesce(func.sum(Invoice.amount_paid), 0).label("total_paid"),
            func.coalesce(func.sum(Invoice.balance_due), 0).label("outstanding_balance"),
            func.count(Invoice.id).label("invoice_count")
        ).where(
            Invoice.customer_id == customer_id,
            Invoice.user_id == user_id,
            Invoice.status != "Cancelled"
        )
        res = await self.session.execute(stmt)
        row = res.one()

        # Overdue invoices count
        overdue_stmt = select(func.count()).select_from(Invoice).where(
            Invoice.customer_id == customer_id,
            Invoice.user_id == user_id,
            Invoice.due_date < today,
            Invoice.balance_due > Decimal("0.00"),
            Invoice.status != "Cancelled"
        )
        overdue_res = await self.session.execute(overdue_stmt)
        overdue_count = overdue_res.scalar() or 0

        return {
            "customer_id": customer_id,
            "total_invoiced": money_decimal(row.total_invoiced),
            "total_paid": money_decimal(row.total_paid),
            "outstanding_balance": money_decimal(row.outstanding_balance),
            "invoice_count": row.invoice_count,
            "overdue_invoice_count": overdue_count
        }
