from typing import List, Optional, Tuple, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select, and_, or_, func, desc, asc, extract
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.category import Category
from app.utils.money import money_decimal, calculate_percentage_change


class TransactionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Transaction:
        tx = Transaction(**kwargs)
        self.session.add(tx)
        await self.session.flush()
        # Reload with category relationship
        stmt = select(Transaction).options(selectinload(Transaction.category)).where(Transaction.id == tx.id)
        res = await self.session.execute(stmt)
        return res.scalar_one()

    async def get_by_id(self, transaction_id: str, user_id: str) -> Optional[Transaction]:
        stmt = (
            select(Transaction)
            .options(selectinload(Transaction.category))
            .where(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id,
                Transaction.is_deleted == False
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_paginated(
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
    ) -> Tuple[List[Transaction], int]:
        conditions = [
            Transaction.user_id == user_id,
            Transaction.is_deleted == False
        ]

        if tx_type:
            conditions.append(Transaction.type == tx_type)
        if category_id:
            conditions.append(Transaction.category_id == category_id)
        if start_date:
            conditions.append(Transaction.transaction_date >= start_date)
        if end_date:
            conditions.append(Transaction.transaction_date <= end_date)
        if min_amount is not None:
            conditions.append(Transaction.amount >= min_amount)
        if max_amount is not None:
            conditions.append(Transaction.amount <= max_amount)
        if payment_method:
            conditions.append(Transaction.payment_method == payment_method)
        if currency:
            conditions.append(Transaction.currency == currency.upper())
        if search:
            s = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Transaction.description.ilike(s),
                    Transaction.reference.ilike(s),
                    Transaction.notes.ilike(s)
                )
            )

        # Count query
        count_stmt = select(func.count()).select_from(Transaction).where(and_(*conditions))
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0

        # Sorting
        sort_column = getattr(Transaction, sort_by, Transaction.transaction_date)
        order = desc(sort_column) if sort_dir.lower() == "desc" else asc(sort_column)

        # Data query
        offset = (page - 1) * page_size
        stmt = (
            select(Transaction)
            .options(selectinload(Transaction.category))
            .where(and_(*conditions))
            .order_by(order, desc(Transaction.created_at))
            .offset(offset)
            .limit(page_size)
        )
        data_res = await self.session.execute(stmt)
        items = list(data_res.scalars().all())
        return items, total

    async def update(self, transaction: Transaction, **kwargs) -> Transaction:
        for k, v in kwargs.items():
            if hasattr(transaction, k) and v is not None:
                setattr(transaction, k, v)
        await self.session.flush()
        stmt = select(Transaction).options(selectinload(Transaction.category)).where(Transaction.id == transaction.id)
        res = await self.session.execute(stmt)
        return res.scalar_one()

    async def soft_delete(self, transaction: Transaction) -> None:
        transaction.is_deleted = True
        await self.session.flush()

    # Financial Aggregations & Metrics
    async def get_total_sum(
        self,
        user_id: str,
        tx_type: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        currency: str = "INR"
    ) -> Decimal:
        conditions = [
            Transaction.user_id == user_id,
            Transaction.type == tx_type,
            Transaction.currency == currency.upper(),
            Transaction.is_deleted == False
        ]
        if start_date:
            conditions.append(Transaction.transaction_date >= start_date)
        if end_date:
            conditions.append(Transaction.transaction_date <= end_date)

        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(and_(*conditions))
        result = await self.session.execute(stmt)
        val = result.scalar() or Decimal("0.00")
        return money_decimal(val)

    async def get_summary_metrics(
        self,
        user_id: str,
        tx_type: str,
        currency: str = "INR"
    ) -> Dict[str, Any]:
        today = date.today()
        first_of_this_month = date(today.year, today.month, 1)
        first_of_this_year = date(today.year, 1, 1)

        # Previous month
        if today.month == 1:
            first_of_prev_month = date(today.year - 1, 12, 1)
            last_of_prev_month = date(today.year - 1, 12, 31)
        else:
            first_of_prev_month = date(today.year, today.month - 1, 1)
            # Find end of previous month
            last_of_prev_month = date(today.year, today.month, 1) - func.cast("1 day", None) if False else date(today.year, today.month - 1, 28)
            # Safe calendar last day calculation:
            import calendar
            _, last_day = calendar.monthrange(first_of_prev_month.year, first_of_prev_month.month)
            last_of_prev_month = date(first_of_prev_month.year, first_of_prev_month.month, last_day)

        total = await self.get_total_sum(user_id, tx_type, currency=currency)
        today_sum = await self.get_total_sum(user_id, tx_type, start_date=today, end_date=today, currency=currency)
        this_month_sum = await self.get_total_sum(user_id, tx_type, start_date=first_of_this_month, end_date=today, currency=currency)
        this_year_sum = await self.get_total_sum(user_id, tx_type, start_date=first_of_this_year, end_date=today, currency=currency)
        prev_month_sum = await self.get_total_sum(user_id, tx_type, start_date=first_of_prev_month, end_date=last_of_prev_month, currency=currency)

        # Month-over-month percentage change
        mom_change = calculate_percentage_change(this_month_sum, prev_month_sum)

        # Average monthly spending (for expenses)
        avg_monthly = None
        if tx_type == "expense":
            months_passed = max(1, today.month)
            avg_monthly = money_decimal(this_year_sum / Decimal(months_passed))

        return {
            "currency": currency.upper(),
            "total": total,
            "today": today_sum,
            "this_month": this_month_sum,
            "this_year": this_year_sum,
            "previous_month": prev_month_sum,
            "month_over_month_change_pct": mom_change,
            "average_monthly": avg_monthly
        }

    async def get_breakdown_by_category(
        self,
        user_id: str,
        tx_type: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        currency: str = "INR"
    ) -> List[Dict[str, Any]]:
        conditions = [
            Transaction.user_id == user_id,
            Transaction.type == tx_type,
            Transaction.currency == currency.upper(),
            Transaction.is_deleted == False
        ]
        if start_date:
            conditions.append(Transaction.transaction_date >= start_date)
        if end_date:
            conditions.append(Transaction.transaction_date <= end_date)

        total_sum = await self.get_total_sum(user_id, tx_type, start_date, end_date, currency)

        stmt = (
            select(
                Transaction.category_id,
                Category.name.label("category_name"),
                Category.icon.label("category_icon"),
                Category.color.label("category_color"),
                func.sum(Transaction.amount).label("category_amount"),
                func.count(Transaction.id).label("transaction_count")
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .where(and_(*conditions))
            .group_by(Transaction.category_id, Category.name, Category.icon, Category.color)
            .order_by(desc("category_amount"))
        )
        res = await self.session.execute(stmt)
        rows = res.all()

        breakdown = []
        for row in rows:
            amount = money_decimal(row.category_amount)
            pct = Decimal("0.00")
            if total_sum > Decimal("0.00"):
                pct = money_decimal((amount / total_sum) * Decimal("100.00"), places=2)
            breakdown.append({
                "category_id": row.category_id,
                "category_name": row.category_name or "Uncategorized",
                "category_icon": row.category_icon or "folder",
                "category_color": row.category_color or "#6366f1",
                "amount": amount,
                "percentage": pct,
                "transaction_count": row.transaction_count
            })
        return breakdown

    async def get_monthly_trends(
        self,
        user_id: str,
        tx_type: str,
        year: int,
        currency: str = "INR"
    ) -> List[Dict[str, Any]]:
        import calendar

        trends = []
        for m in range(1, 13):
            month_name = calendar.month_abbr[m]
            _, last_day = calendar.monthrange(year, m)
            m_start = date(year, m, 1)
            m_end = date(year, m, last_day)

            m_sum = await self.get_total_sum(user_id, tx_type, start_date=m_start, end_date=m_end, currency=currency)
            trends.append({
                "month": m,
                "month_name": month_name,
                "amount": m_sum
            })
        return trends

    async def get_largest_expenses(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 5,
        currency: str = "INR"
    ) -> List[Transaction]:
        conditions = [
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.currency == currency.upper(),
            Transaction.is_deleted == False
        ]
        if start_date:
            conditions.append(Transaction.transaction_date >= start_date)
        if end_date:
            conditions.append(Transaction.transaction_date <= end_date)

        stmt = (
            select(Transaction)
            .options(selectinload(Transaction.category))
            .where(and_(*conditions))
            .order_by(desc(Transaction.amount))
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
