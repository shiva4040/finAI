from typing import List, Optional, Dict, Any, Tuple
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload

from app.models.transaction import Transaction
from app.models.category import Category
from app.models.invoice import Invoice
from app.models.customer import Customer
from app.models.vendor import Vendor
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.customer_repo import CustomerRepository
from app.repositories.vendor_repo import VendorRepository
from app.schemas.report import GenericReportResponse, ReportHeader, ReportSummary
from app.utils.money import money_decimal, calculate_net_cashflow
from app.utils.csv import generate_csv
from app.utils.pdf import generate_report_pdf
from app.core.exceptions import BadRequestException


class ReportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tx_repo = TransactionRepository(session)
        self.cust_repo = CustomerRepository(session)
        self.vend_repo = VendorRepository(session)

    async def get_report_data(
        self,
        report_type: str,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        currency: str = "INR"
    ) -> Tuple[str, List[str], List[str], Dict[str, Any], List[Dict[str, Any]]]:
        """
        Returns (title, headers, field_keys, metrics, rows)
        """
        currency = currency.upper()

        if report_type == "income":
            title = "FinAI Income Report"
            headers = ["Date", "Description", "Category", "Payment Method", "Reference", "Amount"]
            field_keys = ["transaction_date", "description", "category_name", "payment_method", "reference", "amount"]
            items, total = await self.tx_repo.list_paginated(
                user_id=user_id,
                tx_type="income",
                category_id=category_id,
                start_date=start_date,
                end_date=end_date,
                currency=currency,
                page=1,
                page_size=1000
            )
            total_sum = await self.tx_repo.get_total_sum(user_id, "income", start_date, end_date, currency)
            metrics = {"total_income": total_sum, "transaction_count": total}
            rows = [
                {
                    "transaction_date": str(i.transaction_date),
                    "description": i.description,
                    "category_name": i.category.name if i.category else "Uncategorized",
                    "payment_method": i.payment_method,
                    "reference": i.reference or "-",
                    "amount": i.amount
                }
                for i in items
            ]
            return title, headers, field_keys, metrics, rows

        elif report_type == "expenses":
            title = "FinAI Expense Report"
            headers = ["Date", "Description", "Category", "Payment Method", "Reference", "Amount"]
            field_keys = ["transaction_date", "description", "category_name", "payment_method", "reference", "amount"]
            items, total = await self.tx_repo.list_paginated(
                user_id=user_id,
                tx_type="expense",
                category_id=category_id,
                start_date=start_date,
                end_date=end_date,
                currency=currency,
                page=1,
                page_size=1000
            )
            total_sum = await self.tx_repo.get_total_sum(user_id, "expense", start_date, end_date, currency)
            metrics = {"total_expenses": total_sum, "transaction_count": total}
            rows = [
                {
                    "transaction_date": str(i.transaction_date),
                    "description": i.description,
                    "category_name": i.category.name if i.category else "Uncategorized",
                    "payment_method": i.payment_method,
                    "reference": i.reference or "-",
                    "amount": i.amount
                }
                for i in items
            ]
            return title, headers, field_keys, metrics, rows

        elif report_type == "transactions":
            title = "FinAI All Transactions Report"
            headers = ["Date", "Type", "Description", "Category", "Amount", "Currency"]
            field_keys = ["transaction_date", "type", "description", "category_name", "amount", "currency"]
            items, total = await self.tx_repo.list_paginated(
                user_id=user_id,
                category_id=category_id,
                start_date=start_date,
                end_date=end_date,
                currency=currency,
                page=1,
                page_size=1000
            )
            inc = await self.tx_repo.get_total_sum(user_id, "income", start_date, end_date, currency)
            exp = await self.tx_repo.get_total_sum(user_id, "expense", start_date, end_date, currency)
            metrics = {
                "total_income": inc,
                "total_expenses": exp,
                "net_cashflow": calculate_net_cashflow(inc, exp),
                "total_transactions": total
            }
            rows = [
                {
                    "transaction_date": str(i.transaction_date),
                    "type": i.type.upper(),
                    "description": i.description,
                    "category_name": i.category.name if i.category else "Uncategorized",
                    "amount": i.amount,
                    "currency": i.currency
                }
                for i in items
            ]
            return title, headers, field_keys, metrics, rows

        elif report_type == "categories":
            title = "FinAI Category Analytics Report"
            headers = ["Category Name", "Type", "Total Amount", "Share Percentage", "Transactions"]
            field_keys = ["category_name", "type", "amount", "percentage", "transaction_count"]
            exp_b = await self.tx_repo.get_breakdown_by_category(user_id, "expense", start_date, end_date, currency)
            inc_b = await self.tx_repo.get_breakdown_by_category(user_id, "income", start_date, end_date, currency)
            combined = []
            for b in inc_b:
                b["type"] = "INCOME"
                combined.append(b)
            for b in exp_b:
                b["type"] = "EXPENSE"
                combined.append(b)
            metrics = {"categories_with_activity": len(combined)}
            return title, headers, field_keys, metrics, combined

        elif report_type == "monthly":
            title = "FinAI Monthly Cash Flow Report"
            headers = ["Month", "Income", "Expenses", "Net Cash Flow"]
            field_keys = ["month_name", "income", "expense", "net_cashflow"]
            year = start_date.year if start_date else date.today().year
            import calendar
            rows = []
            tot_inc = Decimal("0.00")
            tot_exp = Decimal("0.00")
            for m in range(1, 13):
                m_name = calendar.month_name[m]
                _, last_d = calendar.monthrange(year, m)
                m_s = date(year, m, 1)
                m_e = date(year, m, last_d)
                inc_m = await self.tx_repo.get_total_sum(user_id, "income", m_s, m_e, currency)
                exp_m = await self.tx_repo.get_total_sum(user_id, "expense", m_s, m_e, currency)
                tot_inc += inc_m
                tot_exp += exp_m
                rows.append({
                    "month_name": m_name,
                    "income": inc_m,
                    "expense": exp_m,
                    "net_cashflow": inc_m - exp_m
                })
            metrics = {
                "annual_income": tot_inc,
                "annual_expense": tot_exp,
                "annual_net": tot_inc - tot_exp
            }
            return title, headers, field_keys, metrics, rows

        elif report_type == "invoices":
            title = "FinAI Invoices Status Report"
            headers = ["Invoice #", "Customer", "Issue Date", "Due Date", "Status", "Total", "Balance Due"]
            field_keys = ["invoice_number", "customer_name", "issue_date", "due_date", "status", "total", "balance_due"]
            conds = [Invoice.user_id == user_id]
            if customer_id:
                conds.append(Invoice.customer_id == customer_id)
            if start_date:
                conds.append(Invoice.issue_date >= start_date)
            if end_date:
                conds.append(Invoice.issue_date <= end_date)

            stmt = (
                select(Invoice)
                .options(selectinload(Invoice.customer))
                .where(and_(*conds))
                .order_by(desc(Invoice.issue_date))
            )
            res = await self.session.execute(stmt)
            invoices = list(res.scalars().all())

            tot_inv = sum((i.total for i in invoices), Decimal("0.00"))
            tot_bal = sum((i.balance_due for i in invoices), Decimal("0.00"))
            metrics = {"total_invoiced": tot_inv, "total_balance_due": tot_bal, "invoice_count": len(invoices)}
            rows = [
                {
                    "invoice_number": i.invoice_number,
                    "customer_name": i.customer.name if i.customer else "-",
                    "issue_date": str(i.issue_date),
                    "due_date": str(i.due_date),
                    "status": i.status,
                    "total": i.total,
                    "balance_due": i.balance_due
                }
                for i in invoices
            ]
            return title, headers, field_keys, metrics, rows

        elif report_type == "customers":
            title = "FinAI Customer Accounts Report"
            headers = ["Customer Name", "Company", "Total Invoiced", "Total Paid", "Outstanding Balance"]
            field_keys = ["name", "company", "total_invoiced", "total_paid", "outstanding_balance"]
            customers, total = await self.cust_repo.list_paginated(user_id=user_id, page_size=500)
            rows = []
            tot_out = Decimal("0.00")
            for c in customers:
                summary = await self.cust_repo.get_summary(c.id, user_id)
                tot_out += summary["outstanding_balance"]
                rows.append({
                    "name": c.name,
                    "company": c.company or "-",
                    "total_invoiced": summary["total_invoiced"],
                    "total_paid": summary["total_paid"],
                    "outstanding_balance": summary["outstanding_balance"]
                })
            metrics = {"total_customers": total, "total_outstanding": tot_out}
            return title, headers, field_keys, metrics, rows

        elif report_type == "vendors":
            title = "FinAI Vendor Spending Report"
            headers = ["Vendor Name", "Company", "Total Spending", "Expense Count"]
            field_keys = ["name", "company", "total_spending", "expense_count"]
            vendors, total = await self.vend_repo.list_paginated(user_id=user_id, page_size=500)
            rows = []
            tot_spend = Decimal("0.00")
            for v in vendors:
                summary = await self.vend_repo.get_summary(v.id, user_id)
                tot_spend += summary["total_spending"]
                rows.append({
                    "name": v.name,
                    "company": v.company or "-",
                    "total_spending": summary["total_spending"],
                    "expense_count": summary["expense_count"]
                })
            metrics = {"total_vendors": total, "total_spending": tot_spend}
            return title, headers, field_keys, metrics, rows

        else:
            raise BadRequestException(f"Unsupported report type: '{report_type}'")

    async def generate_json_report(
        self,
        report_type: str,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        currency: str = "INR"
    ) -> GenericReportResponse:
        title, headers, field_keys, metrics, rows = await self.get_report_data(
            report_type=report_type,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            category_id=category_id,
            customer_id=customer_id,
            currency=currency
        )
        return GenericReportResponse(
            header=ReportHeader(
                title=title,
                generated_at=datetime.now().isoformat(),
                currency=currency.upper(),
                start_date=start_date,
                end_date=end_date
            ),
            summary=ReportSummary(total_records=len(rows), metrics=metrics),
            data=rows
        )

    async def generate_csv_export(
        self,
        report_type: str,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        currency: str = "INR"
    ) -> bytes:
        title, headers, field_keys, metrics, rows = await self.get_report_data(
            report_type=report_type,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            category_id=category_id,
            customer_id=customer_id,
            currency=currency
        )
        return generate_csv(headers=headers, rows=rows, field_keys=field_keys)

    async def generate_pdf_export(
        self,
        report_type: str,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        currency: str = "INR"
    ) -> bytes:
        title, headers, field_keys, metrics, rows = await self.get_report_data(
            report_type=report_type,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            category_id=category_id,
            customer_id=customer_id,
            currency=currency
        )
        return generate_report_pdf(
            title=title,
            headers=headers,
            rows=rows,
            field_keys=field_keys,
            metrics=metrics,
            currency=currency
        )
