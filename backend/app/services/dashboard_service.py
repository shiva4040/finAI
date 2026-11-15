from typing import Optional, Dict, Any
from datetime import date, timedelta
from decimal import Decimal
import calendar
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.invoice import Invoice
from app.models.payment import Payment
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.repositories.payment_repo import PaymentRepository
from app.schemas.dashboard import DashboardSummaryResponse, CashFlowMonthItem
from app.schemas.transaction import TransactionResponse, CategoryBreakdownItem
from app.schemas.invoice import InvoiceResponse
from app.schemas.payment import PaymentResponse
from app.utils.money import money_decimal, calculate_net_cashflow


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tx_repo = TransactionRepository(session)
        self.inv_repo = InvoiceRepository(session)
        self.pay_repo = PaymentRepository(session)

    async def get_summary(
        self,
        user_id: str,
        period: str = "this_month",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        currency: str = "INR"
    ) -> DashboardSummaryResponse:
        today = date.today()
        calc_start = start_date
        calc_end = end_date

        if period == "today":
            calc_start = today
            calc_end = today
        elif period == "this_week":
            calc_start = today - timedelta(days=today.weekday())
            calc_end = today
        elif period == "this_month":
            calc_start = date(today.year, today.month, 1)
            calc_end = today
        elif period == "last_month":
            if today.month == 1:
                calc_start = date(today.year - 1, 12, 1)
                calc_end = date(today.year - 1, 12, 31)
            else:
                _, last_day = calendar.monthrange(today.year, today.month - 1)
                calc_start = date(today.year, today.month - 1, 1)
                calc_end = date(today.year, today.month - 1, last_day)
        elif period == "this_year":
            calc_start = date(today.year, 1, 1)
            calc_end = today

        # 1. Total Income & Total Expense for selected period
        income = await self.tx_repo.get_total_sum(user_id, "income", calc_start, calc_end, currency)
        expense = await self.tx_repo.get_total_sum(user_id, "expense", calc_start, calc_end, currency)
        net_flow = calculate_net_cashflow(income, expense)

        # Baseline account balance: all-time net cashflow
        all_time_income = await self.tx_repo.get_total_sum(user_id, "income", currency=currency)
        all_time_expense = await self.tx_repo.get_total_sum(user_id, "expense", currency=currency)
        total_balance = calculate_net_cashflow(all_time_income, all_time_expense)

        # 2. Invoices & Overdue metrics
        await self.inv_repo.check_and_update_overdue(user_id)
        inv_stmt = select(
            func.coalesce(func.sum(Invoice.balance_due), 0).label("outstanding_amount")
        ).where(
            Invoice.user_id == user_id,
            Invoice.status.notin_(["Paid", "Cancelled"])
        )
        inv_res = await self.session.execute(inv_stmt)
        outstanding_amt = money_decimal(inv_res.scalar() or Decimal("0.00"))

        overdue_stmt = select(
            func.count(Invoice.id).label("overdue_count"),
            func.coalesce(func.sum(Invoice.balance_due), 0).label("overdue_amount")
        ).where(
            Invoice.user_id == user_id,
            Invoice.due_date < today,
            Invoice.balance_due > Decimal("0.00"),
            Invoice.status != "Cancelled"
        )
        overdue_res = await self.session.execute(overdue_stmt)
        overdue_row = overdue_res.one()

        # 3. Monthly Cash Flow (12 months of current year)
        year = today.year
        cash_flow_list = []
        for m in range(1, 13):
            m_name = calendar.month_abbr[m]
            _, last_d = calendar.monthrange(year, m)
            m_s = date(year, m, 1)
            m_e = date(year, m, last_d)
            m_inc = await self.tx_repo.get_total_sum(user_id, "income", m_s, m_e, currency)
            m_exp = await self.tx_repo.get_total_sum(user_id, "expense", m_s, m_e, currency)
            cash_flow_list.append(CashFlowMonthItem(
                month=m,
                month_name=m_name,
                income=m_inc,
                expense=m_exp,
                net_cashflow=m_inc - m_exp
            ))

        # 4. Breakdowns
        exp_breakdown = await self.tx_repo.get_breakdown_by_category(user_id, "expense", calc_start, calc_end, currency)
        inc_breakdown = await self.tx_repo.get_breakdown_by_category(user_id, "income", calc_start, calc_end, currency)

        # 5. Recent items
        recent_tx, _ = await self.tx_repo.list_paginated(user_id=user_id, page=1, page_size=5)
        recent_inv, _ = await self.inv_repo.list_paginated(user_id=user_id, page=1, page_size=5)
        recent_pay, _ = await self.pay_repo.list_paginated(user_id=user_id, page=1, page_size=5)

        return DashboardSummaryResponse(
            currency=currency.upper(),
            period=period,
            total_income=income,
            total_expenses=expense,
            net_cash_flow=net_flow,
            total_balance=total_balance,
            outstanding_invoices_amount=outstanding_amt,
            overdue_invoices_amount=money_decimal(overdue_row.overdue_amount),
            overdue_invoices_count=overdue_row.overdue_count,
            monthly_cash_flow=cash_flow_list,
            expense_breakdown=[CategoryBreakdownItem(**b) for b in exp_breakdown],
            income_breakdown=[CategoryBreakdownItem(**b) for b in inc_breakdown],
            recent_transactions=[TransactionResponse.model_validate(t) for t in recent_tx],
            recent_invoices=[InvoiceResponse.model_validate(i) for i in recent_inv],
            recent_payments=[PaymentResponse.model_validate(p) for p in recent_pay]
        )
