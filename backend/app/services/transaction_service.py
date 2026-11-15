from typing import List, Optional, Tuple, Dict, Any
from datetime import date
from decimal import Decimal
import math

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.notification_repo import NotificationRepository
from app.core.exceptions import (
    NotFoundException,
    BadRequestException,
    ForbiddenException,
)
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    FinancialMetricSummary,
    CategoryBreakdownItem,
    MonthlyTrendItem,
)
from app.utils.money import money_decimal


class TransactionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = TransactionRepository(session)
        self.cat_repo = CategoryRepository(session)
        self.notif_repo = NotificationRepository(session)

    async def _validate_category(self, user_id: str, category_id: Optional[str], tx_type: str) -> None:
        if not category_id:
            return
        cat = await self.cat_repo.get_by_id(category_id=category_id, user_id=user_id)
        if not cat:
            raise NotFoundException("Category", category_id)
        if cat.type != tx_type:
            raise BadRequestException(
                f"Category '{cat.name}' is an {cat.type} category and cannot be assigned to an {tx_type} transaction"
            )

    async def create_transaction(self, user_id: str, data: TransactionCreate) -> Transaction:
        await self._validate_category(user_id, data.category_id, data.type)

        amount = money_decimal(data.amount)
        if amount <= Decimal("0.00"):
            raise BadRequestException("Transaction amount must be strictly greater than zero")

        tx = await self.repo.create(
            user_id=user_id,
            category_id=data.category_id,
            type=data.type,
            amount=amount,
            currency=data.currency or "INR",
            description=data.description.strip(),
            transaction_date=data.transaction_date,
            payment_method=data.payment_method or "bank_transfer",
            reference=data.reference.strip() if data.reference else None,
            notes=data.notes.strip() if data.notes else None,
            source="manual",
            is_deleted=False
        )
        notif_type = "income_created" if data.type == "income" else "expense_created"
        title = "Income Recorded" if data.type == "income" else "Expense Recorded"
        msg = f"Recorded {data.type} of ₹{amount:.2f} for '{data.description.strip()}'."
        await self.notif_repo.create(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=msg,
            is_read=False,
            reference_id=tx.id
        )
        await self.session.commit()
        return tx

    async def get_transaction(self, transaction_id: str, user_id: str) -> Transaction:
        tx = await self.repo.get_by_id(transaction_id, user_id)
        if not tx:
            raise NotFoundException("Transaction", transaction_id)
        return tx

    async def list_transactions(
        self,
        user_id: str,
        tx_type: Optional[str] = None,
        category_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None,
        payment_method: Optional[str] = None,
        currency: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "transaction_date",
        sort_dir: str = "desc",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        items, total = await self.repo.list_paginated(
            user_id=user_id,
            tx_type=tx_type,
            category_id=category_id,
            start_date=start_date,
            end_date=end_date,
            min_amount=min_amount,
            max_amount=max_amount,
            payment_method=payment_method,
            currency=currency,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
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

    async def update_transaction(self, transaction_id: str, user_id: str, data: TransactionUpdate) -> Transaction:
        tx = await self.get_transaction(transaction_id, user_id)

        target_type = tx.type
        if data.category_id:
            await self._validate_category(user_id, data.category_id, target_type)

        update_fields = {}
        if data.category_id is not None:
            update_fields["category_id"] = data.category_id
        if data.amount is not None:
            amt = money_decimal(data.amount)
            if amt <= Decimal("0.00"):
                raise BadRequestException("Transaction amount must be strictly greater than zero")
            update_fields["amount"] = amt
        if data.description is not None:
            update_fields["description"] = data.description.strip()
        if data.transaction_date is not None:
            update_fields["transaction_date"] = data.transaction_date
        if data.payment_method is not None:
            update_fields["payment_method"] = data.payment_method
        if data.reference is not None:
            update_fields["reference"] = data.reference.strip()
        if data.notes is not None:
            update_fields["notes"] = data.notes.strip()

        updated = await self.repo.update(tx, **update_fields)
        await self.session.commit()
        return updated

    async def delete_transaction(self, transaction_id: str, user_id: str) -> None:
        tx = await self.get_transaction(transaction_id, user_id)
        await self.repo.soft_delete(tx)
        await self.session.commit()

    # Summaries & Analytics
    async def get_summary(self, user_id: str, tx_type: str, currency: str = "INR") -> FinancialMetricSummary:
        summary_data = await self.repo.get_summary_metrics(user_id=user_id, tx_type=tx_type, currency=currency)
        return FinancialMetricSummary(**summary_data)

    async def get_by_category(
        self,
        user_id: str,
        tx_type: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        currency: str = "INR"
    ) -> List[CategoryBreakdownItem]:
        breakdown = await self.repo.get_breakdown_by_category(
            user_id=user_id,
            tx_type=tx_type,
            start_date=start_date,
            end_date=end_date,
            currency=currency
        )
        return [CategoryBreakdownItem(**item) for item in breakdown]

    async def get_trends(self, user_id: str, tx_type: str, year: int, currency: str = "INR") -> List[MonthlyTrendItem]:
        trends = await self.repo.get_monthly_trends(user_id=user_id, tx_type=tx_type, year=year, currency=currency)
        return [MonthlyTrendItem(**item) for item in trends]

    async def get_largest_expenses(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 5,
        currency: str = "INR"
    ) -> List[Transaction]:
        return await self.repo.get_largest_expenses(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            currency=currency
        )
