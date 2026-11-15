from typing import List, Optional, Tuple, Dict, Any
from datetime import date, datetime
from decimal import Decimal
import secrets
from sqlalchemy import select, and_, or_, func, desc, asc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.customer import Customer
from app.utils.money import money_decimal, calculate_invoice_total


class InvoiceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def generate_invoice_number(self, user_id: str) -> str:
        """
        Generates a unique, collision-resistant sequential invoice number for the user.
        Format: INV-YYYY-0001
        """
        current_year = date.today().year
        prefix = f"INV-{current_year}-"

        stmt = (
            select(Invoice.invoice_number)
            .where(
                Invoice.user_id == user_id,
                Invoice.invoice_number.like(f"{prefix}%")
            )
            .order_by(desc(Invoice.invoice_number))
            .limit(1)
        )
        res = await self.session.execute(stmt)
        last_inv = res.scalar()

        if last_inv:
            try:
                last_seq = int(last_inv.split("-")[-1])
                new_seq = last_seq + 1
            except ValueError:
                new_seq = secrets.randbelow(9000) + 1000
        else:
            new_seq = 1

        inv_num = f"{prefix}{new_seq:04d}"

        # Double check uniqueness
        check_stmt = select(func.count()).select_from(Invoice).where(
            Invoice.user_id == user_id,
            Invoice.invoice_number == inv_num
        )
        check_res = await self.session.execute(check_stmt)
        if (check_res.scalar() or 0) > 0:
            inv_num = f"{prefix}{new_seq:04d}-{secrets.token_hex(2).upper()}"

        return inv_num

    async def create_with_items(
        self,
        user_id: str,
        customer_id: str,
        invoice_number: str,
        issue_date: date,
        due_date: date,
        currency: str,
        notes: Optional[str],
        invoice_discount: Decimal,
        items_data: List[Dict[str, Any]]
    ) -> Invoice:
        # Calculate totals
        calculated = calculate_invoice_total(items_data, invoice_level_discount=invoice_discount)

        invoice = Invoice(
            user_id=user_id,
            customer_id=customer_id,
            invoice_number=invoice_number,
            issue_date=issue_date,
            due_date=due_date,
            currency=currency.upper(),
            notes=notes,
            subtotal=calculated["subtotal"],
            tax_total=calculated["tax_total"],
            discount_total=calculated["discount_total"],
            total=calculated["total"],
            amount_paid=Decimal("0.00"),
            balance_due=calculated["total"],
            status="Draft"
        )
        self.session.add(invoice)
        await self.session.flush()

        for item_data in items_data:
            qty = money_decimal(item_data["quantity"], places=4)
            unit_price = money_decimal(item_data["unit_price"], places=2)
            base = qty * unit_price
            tax_rate = money_decimal(item_data.get("tax_rate", 0), places=4)
            tax_amount = money_decimal((base * tax_rate) / Decimal("100"), places=2)
            disc = money_decimal(item_data.get("discount_amount", 0), places=2)
            item_tot = base + tax_amount - disc
            if item_tot < Decimal("0.00"):
                item_tot = Decimal("0.00")

            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data["description"].strip(),
                quantity=qty,
                unit_price=unit_price,
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                discount_amount=disc,
                total=money_decimal(item_tot, places=2)
            )
            self.session.add(item)

        await self.session.flush()
        return await self.get_by_id(invoice.id, user_id)

    async def get_by_id(self, invoice_id: str, user_id: str) -> Optional[Invoice]:
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items), selectinload(Invoice.customer), selectinload(Invoice.payments))
            .where(Invoice.id == invoice_id, Invoice.user_id == user_id)
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_for_update(self, invoice_id: str, user_id: str) -> Optional[Invoice]:
        """
        Row-level lock for concurrency safety during payment processing.
        """
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items), selectinload(Invoice.customer), selectinload(Invoice.payments))
            .where(Invoice.id == invoice_id, Invoice.user_id == user_id)
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_paginated(
        self,
        user_id: str,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Invoice], int]:
        conditions = [Invoice.user_id == user_id]

        if customer_id:
            conditions.append(Invoice.customer_id == customer_id)
        if status:
            conditions.append(Invoice.status == status)
        if start_date:
            conditions.append(Invoice.issue_date >= start_date)
        if end_date:
            conditions.append(Invoice.issue_date <= end_date)
        if search:
            s = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Invoice.invoice_number.ilike(s),
                    Invoice.notes.ilike(s)
                )
            )

        count_stmt = select(func.count()).select_from(Invoice).where(and_(*conditions))
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items), selectinload(Invoice.customer), selectinload(Invoice.payments))
            .where(and_(*conditions))
            .order_by(desc(Invoice.issue_date), desc(Invoice.created_at))
            .offset(offset)
            .limit(page_size)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all()), total

    async def update_status(self, invoice: Invoice, new_status: str) -> Invoice:
        invoice.status = new_status
        await self.session.flush()
        return invoice

    async def check_and_update_overdue(self, user_id: str) -> int:
        """
        Updates invoices to Overdue if due_date < today, balance > 0, and status not Cancelled or Paid.
        """
        today = date.today()
        stmt = (
            select(Invoice)
            .where(
                Invoice.user_id == user_id,
                Invoice.due_date < today,
                Invoice.balance_due > Decimal("0.00"),
                Invoice.status.notin_(["Paid", "Cancelled", "Overdue"])
            )
        )
        res = await self.session.execute(stmt)
        overdue_invoices = list(res.scalars().all())
        for inv in overdue_invoices:
            inv.status = "Overdue"
        await self.session.flush()
        return len(overdue_invoices)

    async def delete(self, invoice: Invoice) -> None:
        await self.session.delete(invoice)
        await self.session.flush()
