from typing import List, Optional, Dict, Any
from datetime import date
from decimal import Decimal
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.payment import Payment
from app.models.transaction import Transaction
from app.repositories.payment_repo import PaymentRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.notification_repo import NotificationRepository
from app.core.exceptions import (
    NotFoundException,
    BadRequestException,
    ForbiddenException,
)
from app.schemas.payment import PaymentCreate
from app.utils.money import money_decimal


class PaymentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = PaymentRepository(session)
        self.inv_repo = InvoiceRepository(session)
        self.tx_repo = TransactionRepository(session)
        self.notif_repo = NotificationRepository(session)

    async def record_payment(self, user_id: str, data: PaymentCreate) -> Payment:
        # Row-level lock invoice
        invoice = await self.inv_repo.get_for_update(invoice_id=data.invoice_id, user_id=user_id)
        if not invoice:
            raise NotFoundException("Invoice", data.invoice_id)

        if invoice.status == "Cancelled":
            raise BadRequestException("Cannot record payment against a cancelled invoice.")

        amt = money_decimal(data.amount)
        if amt <= Decimal("0.00"):
            raise BadRequestException("Payment amount must be greater than zero.")

        # Overpayment protection
        if amt > invoice.balance_due:
            raise BadRequestException(
                f"Payment amount of ₹{amt:.2f} exceeds remaining invoice balance of ₹{invoice.balance_due:.2f}."
            )

        # 1. Create Payment
        payment = await self.repo.create(
            user_id=user_id,
            invoice_id=invoice.id,
            amount=amt,
            currency=invoice.currency,
            payment_date=data.payment_date,
            payment_method=data.payment_method or "bank_transfer",
            reference=data.reference.strip() if data.reference else None,
            notes=data.notes.strip() if data.notes else None,
            is_reversed=False
        )

        # 2. Update Invoice Balances
        new_paid = invoice.amount_paid + amt
        new_balance = invoice.total - new_paid
        invoice.amount_paid = money_decimal(new_paid)
        invoice.balance_due = money_decimal(new_balance)

        if invoice.balance_due == Decimal("0.00"):
            invoice.status = "Paid"
        else:
            invoice.status = "Partially Paid"

        # 3. Synchronize Income Transaction
        desc = f"Payment for Invoice {invoice.invoice_number}"
        ref = data.reference.strip() if data.reference else invoice.invoice_number
        await self.tx_repo.create(
            user_id=user_id,
            category_id=None,
            type="income",
            amount=amt,
            currency=invoice.currency,
            description=desc,
            transaction_date=data.payment_date,
            payment_method=data.payment_method or "bank_transfer",
            reference=ref,
            notes=f"Linked to FinAI Payment {payment.id}",
            source="invoice_payment",
            is_deleted=False
        )

        # 4. Dispatch Notification
        if invoice.status == "Paid":
            notif_type = "payment_received"
            title = "Payment Recorded — Invoice Paid"
            msg = f"Invoice #{invoice.invoice_number} is fully settled. Recorded payment of ₹{amt:.2f}."
        else:
            notif_type = "partial_payment"
            title = "Partial Payment Received"
            msg = f"Received ₹{amt:.2f} for Invoice #{invoice.invoice_number}. Remaining balance due: ₹{invoice.balance_due:.2f}."

        await self.notif_repo.create(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=msg,
            is_read=False,
            reference_id=payment.id
        )

        await self.session.commit()
        await self.session.refresh(payment)
        return payment

    async def get_payment(self, payment_id: str, user_id: str) -> Payment:
        payment = await self.repo.get_by_id(payment_id, user_id)
        if not payment:
            raise NotFoundException("Payment", payment_id)
        return payment

    async def list_payments(
        self,
        user_id: str,
        invoice_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        items, total = await self.repo.list_paginated(
            user_id=user_id,
            invoice_id=invoice_id,
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

    async def reverse_payment(self, payment_id: str, user_id: str) -> Payment:
        payment = await self.get_payment(payment_id, user_id)
        if payment.is_reversed:
            raise BadRequestException("This payment has already been reversed.")

        # Row-level lock invoice
        invoice = await self.inv_repo.get_for_update(invoice_id=payment.invoice_id, user_id=user_id)
        if not invoice:
            raise NotFoundException("Invoice", payment.invoice_id)

        # 1. Reverse payment record
        await self.repo.reverse_payment(payment)

        # 2. Recalculate invoice balances
        invoice.amount_paid = money_decimal(max(Decimal("0.00"), invoice.amount_paid - payment.amount))
        invoice.balance_due = money_decimal(invoice.total - invoice.amount_paid)

        today = date.today()
        if invoice.amount_paid == Decimal("0.00"):
            if invoice.due_date < today:
                invoice.status = "Overdue"
            else:
                invoice.status = "Sent"
        else:
            invoice.status = "Partially Paid"

        # 3. Soft-delete or reverse the linked income transaction
        linked_note = f"Linked to FinAI Payment {payment.id}"
        stmt = (
            update(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.source == "invoice_payment",
                Transaction.notes.contains(payment.id),
                Transaction.is_deleted == False
            )
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)

        await self.session.commit()
        await self.session.refresh(payment)
        return payment
