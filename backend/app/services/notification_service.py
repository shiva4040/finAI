from typing import List, Optional, Dict, Any
from datetime import date
from decimal import Decimal
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.notification import Notification
from app.models.invoice import Invoice
from app.repositories.notification_repo import NotificationRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.core.exceptions import NotFoundException


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = NotificationRepository(session)
        self.inv_repo = InvoiceRepository(session)

    async def list_notifications(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        items, total, unread_count = await self.repo.list_paginated(user_id=user_id, page=page, page_size=page_size)
        return {
            "items": items,
            "total": total,
            "unread_count": unread_count,
            "page": page,
            "page_size": page_size
        }

    async def mark_read(self, notif_id: str, user_id: str) -> Notification:
        notif = await self.repo.get_by_id(notif_id, user_id)
        if not notif:
            raise NotFoundException("Notification", notif_id)
        updated = await self.repo.mark_read(notif)
        await self.session.commit()
        return updated

    async def mark_all_read(self, user_id: str) -> int:
        count = await self.repo.mark_all_read(user_id)
        await self.session.commit()
        return count

    async def delete_notification(self, notif_id: str, user_id: str) -> None:
        notif = await self.repo.get_by_id(notif_id, user_id)
        if not notif:
            raise NotFoundException("Notification", notif_id)
        await self.repo.delete(notif)
        await self.session.commit()

    async def clear_all(self, user_id: str) -> int:
        count = await self.repo.clear_all(user_id)
        await self.session.commit()
        return count

    async def check_and_create_overdue_notifications(self, user_id: str) -> int:
        """
        Scans for overdue invoices and creates notification if not already dispatched.
        Safe to call repeatedly (idempotent).
        """
        today = date.today()
        stmt = (
            select(Invoice)
            .where(
                Invoice.user_id == user_id,
                Invoice.due_date < today,
                Invoice.balance_due > Decimal("0.00"),
                Invoice.status != "Cancelled"
            )
        )
        res = await self.session.execute(stmt)
        overdue_invoices = list(res.scalars().all())

        created_count = 0
        for inv in overdue_invoices:
            ref_id = f"overdue_{inv.id}"
            already_notified = await self.repo.exists_by_reference(
                user_id=user_id,
                notif_type="invoice_overdue",
                reference_id=ref_id
            )
            if not already_notified:
                await self.repo.create(
                    user_id=user_id,
                    type="invoice_overdue",
                    title="Invoice Payment Overdue",
                    message=f"Invoice #{inv.invoice_number} of ₹{inv.balance_due:.2f} was due on {inv.due_date}.",
                    is_read=False,
                    reference_id=ref_id
                )
                created_count += 1

        if created_count > 0:
            await self.session.commit()
        return created_count
