from typing import List, Optional, Tuple
from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment


class PaymentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Payment:
        payment = Payment(**kwargs)
        self.session.add(payment)
        await self.session.flush()
        return payment

    async def get_by_id(self, payment_id: str, user_id: str) -> Optional[Payment]:
        stmt = select(Payment).where(
            Payment.id == payment_id,
            Payment.user_id == user_id
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_for_invoice(self, invoice_id: str, user_id: str) -> List[Payment]:
        stmt = (
            select(Payment)
            .where(Payment.invoice_id == invoice_id, Payment.user_id == user_id)
            .order_by(desc(Payment.payment_date), desc(Payment.created_at))
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def list_paginated(
        self,
        user_id: str,
        invoice_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Payment], int]:
        conditions = [Payment.user_id == user_id]
        if invoice_id:
            conditions.append(Payment.invoice_id == invoice_id)

        count_stmt = select(func.count()).select_from(Payment).where(and_(*conditions))
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Payment)
            .where(and_(*conditions))
            .order_by(desc(Payment.payment_date), desc(Payment.created_at))
            .offset(offset)
            .limit(page_size)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all()), total

    async def reverse_payment(self, payment: Payment) -> Payment:
        payment.is_reversed = True
        await self.session.flush()
        return payment
