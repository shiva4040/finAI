from typing import List, Optional, Dict, Any
from datetime import date
from decimal import Decimal
import math
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.repositories.invoice_repo import InvoiceRepository
from app.repositories.customer_repo import CustomerRepository
from app.repositories.payment_repo import PaymentRepository
from app.repositories.notification_repo import NotificationRepository
from app.core.exceptions import (
    NotFoundException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
)
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from app.utils.money import money_decimal
from app.utils.pdf import generate_invoice_pdf


class InvoiceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = InvoiceRepository(session)
        self.cust_repo = CustomerRepository(session)
        self.payment_repo = PaymentRepository(session)
        self.notif_repo = NotificationRepository(session)

    async def create_invoice(self, user_id: str, data: InvoiceCreate) -> Invoice:
        # Validate customer
        cust = await self.cust_repo.get_by_id(data.customer_id, user_id)
        if not cust:
            raise NotFoundException("Customer", data.customer_id)

        # Invoice number
        if data.invoice_number and data.invoice_number.strip():
            inv_number = data.invoice_number.strip()
        else:
            inv_number = await self.repo.generate_invoice_number(user_id)

        if data.due_date < data.issue_date:
            raise BadRequestException("Invoice due date cannot precede the issue date")

        items_dict = [item.model_dump() for item in data.items]
        invoice = await self.repo.create_with_items(
            user_id=user_id,
            customer_id=data.customer_id,
            invoice_number=inv_number,
            issue_date=data.issue_date,
            due_date=data.due_date,
            currency=data.currency or "INR",
            notes=data.notes.strip() if data.notes else None,
            invoice_discount=money_decimal(data.discount_total or 0),
            items_data=items_dict
        )
        await self.notif_repo.create(
            user_id=user_id,
            type="invoice_created",
            title="Invoice Created",
            message=f"Created invoice #{invoice.invoice_number} of ₹{invoice.total:.2f} for {cust.name}.",
            is_read=False,
            reference_id=invoice.id
        )
        await self.session.commit()
        return invoice

    async def get_invoice(self, invoice_id: str, user_id: str) -> Invoice:
        inv = await self.repo.get_by_id(invoice_id, user_id)
        if not inv:
            raise NotFoundException("Invoice", invoice_id)
        
        # Check dynamic overdue status
        if inv.status not in ["Paid", "Cancelled", "Overdue"] and inv.due_date < date.today() and inv.balance_due > 0:
            await self.repo.update_status(inv, "Overdue")
            await self.session.commit()
        return inv

    async def list_invoices(
        self,
        user_id: str,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        # Sync overdue invoices
        await self.repo.check_and_update_overdue(user_id)

        items, total = await self.repo.list_paginated(
            user_id=user_id,
            customer_id=customer_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            search=search,
            page=page,
            page_size=page_size
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }

    async def send_invoice(self, invoice_id: str, user_id: str) -> Invoice:
        inv = await self.get_invoice(invoice_id, user_id)
        if inv.status != "Draft":
            raise BadRequestException(f"Only Draft invoices can be sent. Current status is {inv.status}.")
        updated = await self.repo.update_status(inv, "Sent")
        await self.session.commit()
        return updated

    async def cancel_invoice(self, invoice_id: str, user_id: str) -> Invoice:
        inv = await self.get_invoice(invoice_id, user_id)
        if inv.status == "Paid":
            raise BadRequestException("Cannot cancel an invoice that has been fully paid.")
        if inv.amount_paid > Decimal("0.00"):
            raise BadRequestException("Cannot cancel an invoice with active payments. Reverse payments first.")
        
        updated = await self.repo.update_status(inv, "Cancelled")
        await self.session.commit()
        return updated

    async def delete_invoice(self, invoice_id: str, user_id: str) -> None:
        inv = await self.get_invoice(invoice_id, user_id)
        if inv.amount_paid > Decimal("0.00"):
            raise BadRequestException("Cannot delete an invoice that has recorded payments.")
        await self.repo.delete(inv)
        await self.session.commit()

    async def generate_pdf(self, invoice_id: str, user_id: str) -> bytes:
        inv = await self.get_invoice(invoice_id, user_id)
        cust = await self.cust_repo.get_by_id(inv.customer_id, user_id)
        return generate_invoice_pdf(invoice=inv, customer=cust)
