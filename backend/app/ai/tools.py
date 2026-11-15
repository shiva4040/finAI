from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import selectinload

from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.customer import Customer
from app.models.vendor import Vendor
from app.models.payment import Payment
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.repositories.customer_repo import CustomerRepository
from app.repositories.vendor_repo import VendorRepository
from app.repositories.payment_repo import PaymentRepository
from app.utils.money import (
    money_decimal,
    calculate_net_cashflow,
    calculate_percentage_change,
    format_currency_inr,
)

# OpenAI Tool Specifications
FINANCIAL_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_total_income",
            "description": "Calculates total income for the authenticated user within an optional date range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_total_expenses",
            "description": "Calculates total expenses for the authenticated user within an optional date range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_balance",
            "description": "Calculates current net balance (total income minus total expenses) and operating liquidity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_transactions",
            "description": "Retrieves the user's latest or filtered financial transactions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 5, "description": "Number of transactions to return"},
                    "transaction_type": {"type": "string", "enum": ["income", "expense", "all"], "default": "all"},
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "category": {"type": "string", "description": "Filter by category name"},
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_expenses_by_category",
            "description": "Returns expense breakdown grouped by category with amounts and percentages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_largest_expenses",
            "description": "Finds the largest expense transactions for the user within a period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 5},
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_monthly_summary",
            "description": "Returns monthly income, expense, and net cash flow trends for the past months.",
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {"type": "integer", "default": 6},
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_periods",
            "description": "Compares income or expense between current period and previous period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "current_start": {"type": "string", "description": "YYYY-MM-DD"},
                    "current_end": {"type": "string", "description": "YYYY-MM-DD"},
                    "previous_start": {"type": "string", "description": "YYYY-MM-DD"},
                    "previous_end": {"type": "string", "description": "YYYY-MM-DD"},
                    "type": {"type": "string", "enum": ["income", "expense"]},
                    "currency": {"type": "string", "default": "INR"}
                },
                "required": ["current_start", "current_end", "previous_start", "previous_end"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customers",
            "description": "Retrieves the list of registered corporate clients and their accounts receivable balance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_vendors",
            "description": "Retrieves the list of registered vendors and expense partners.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_invoices",
            "description": "Lists customer invoices, optionally filtered by status (Draft, Sent, Paid, Partial, Overdue).",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["All", "Draft", "Sent", "Paid", "Partial", "Overdue"]},
                    "limit": {"type": "integer", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_overdue_invoices",
            "description": "Returns all invoices that are currently past their due date and have unpaid balance.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_payment_summaries",
            "description": "Summarizes all recorded customer payments received across invoices.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_financial_summary",
            "description": "Provides total income, total expenses, net cash flow, and outstanding balances.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "currency": {"type": "string", "default": "INR"}
                }
            }
        }
    }
]


class FinancialToolExecutor:
    def __init__(self, session: AsyncSession, user_id: str):
        self.session = session
        self.user_id = user_id
        self.tx_repo = TransactionRepository(session)
        self.inv_repo = InvoiceRepository(session)
        self.cust_repo = CustomerRepository(session)
        self.vend_repo = VendorRepository(session)
        self.pay_repo = PaymentRepository(session)

    async def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Safely executes approved financial tool strictly scoped to authenticated user_id.
        All financial arithmetic strictly uses Decimal.
        """
        def parse_d(d_str):
            if not d_str:
                return None
            try:
                return date.fromisoformat(d_str)
            except Exception:
                return None

        currency = args.get("currency", "INR").upper()

        if tool_name == "get_total_income":
            s = parse_d(args.get("start_date"))
            e = parse_d(args.get("end_date"))
            tot = await self.tx_repo.get_total_sum(self.user_id, "income", s, e, currency)
            return {
                "currency": currency,
                "total_income": str(tot),
                "formatted_income": format_currency_inr(tot),
                "start_date": str(s) if s else None,
                "end_date": str(e) if e else None
            }

        elif tool_name == "get_total_expenses":
            s = parse_d(args.get("start_date"))
            e = parse_d(args.get("end_date"))
            tot = await self.tx_repo.get_total_sum(self.user_id, "expense", s, e, currency)
            return {
                "currency": currency,
                "total_expenses": str(tot),
                "formatted_expenses": format_currency_inr(tot),
                "start_date": str(s) if s else None,
                "end_date": str(e) if e else None
            }

        elif tool_name == "get_balance":
            inc = await self.tx_repo.get_total_sum(self.user_id, "income", None, None, currency)
            exp = await self.tx_repo.get_total_sum(self.user_id, "expense", None, None, currency)
            bal = inc - exp
            return {
                "currency": currency,
                "total_income": str(inc),
                "total_expenses": str(exp),
                "net_balance": str(bal),
                "formatted_balance": format_currency_inr(bal)
            }

        elif tool_name == "get_transactions":
            s = parse_d(args.get("start_date"))
            e = parse_d(args.get("end_date"))
            limit = int(args.get("limit", 5))
            tx_type = args.get("transaction_type", "all").lower()
            if tx_type == "all":
                tx_type = None

            items, total = await self.tx_repo.list_paginated(
                user_id=self.user_id,
                tx_type=tx_type,
                start_date=s,
                end_date=e,
                page=1,
                page_size=min(limit, 50)
            )
            return {
                "total_matched": total,
                "count": len(items),
                "transactions": [
                    {
                        "id": t.id,
                        "date": str(t.transaction_date),
                        "type": t.type.value if hasattr(t.type, "value") else str(t.type),
                        "description": t.description,
                        "category": t.category.name if t.category else "General",
                        "amount": str(t.amount),
                        "formatted_amount": format_currency_inr(t.amount),
                        "payment_method": t.payment_method.value if hasattr(t.payment_method, "value") else str(t.payment_method)
                    }
                    for t in items
                ]
            }

        elif tool_name == "get_expenses_by_category":
            s = parse_d(args.get("start_date"))
            e = parse_d(args.get("end_date"))
            breakdown = await self.tx_repo.get_breakdown_by_category(self.user_id, "expense", s, e, currency)
            return {
                "currency": currency,
                "categories": [
                    {
                        "category": b["category_name"],
                        "amount": str(b["amount"]),
                        "formatted": format_currency_inr(b["amount"]),
                        "percentage": str(b["percentage"]) + "%"
                    }
                    for b in breakdown
                ]
            }

        elif tool_name == "get_largest_expenses":
            s = parse_d(args.get("start_date"))
            e = parse_d(args.get("end_date"))
            limit = int(args.get("limit", 5))
            largest = await self.tx_repo.get_largest_expenses(self.user_id, s, e, limit, currency)
            return {
                "currency": currency,
                "expenses": [
                    {
                        "description": item.description,
                        "amount": str(item.amount),
                        "formatted": format_currency_inr(item.amount),
                        "date": str(item.transaction_date),
                        "category": item.category.name if item.category else "Uncategorized"
                    }
                    for item in largest
                ]
            }

        elif tool_name == "get_monthly_summary":
            months_count = int(args.get("months", 6))
            monthly_data = await self.tx_repo.get_monthly_cashflow_data(self.user_id, months=months_count)
            return {
                "currency": currency,
                "months": [
                    {
                        "month": m["month"],
                        "income": str(m["income"]),
                        "formatted_income": format_currency_inr(m["income"]),
                        "expenses": str(m["expenses"]),
                        "formatted_expenses": format_currency_inr(m["expenses"]),
                        "net_flow": str(m["net_flow"]),
                        "formatted_net_flow": format_currency_inr(m["net_flow"])
                    }
                    for m in monthly_data
                ]
            }

        elif tool_name == "get_customers":
            limit = int(args.get("limit", 10))
            custs, total = await self.cust_repo.list_paginated(user_id=self.user_id, page=1, page_size=limit)
            return {
                "total_customers": total,
                "customers": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "email": c.email,
                        "phone": c.phone or "-"
                    }
                    for c in custs
                ]
            }

        elif tool_name == "get_vendors":
            limit = int(args.get("limit", 10))
            vends, total = await self.vend_repo.list_paginated(user_id=self.user_id, page=1, page_size=limit)
            return {
                "total_vendors": total,
                "vendors": [
                    {
                        "id": v.id,
                        "name": v.name,
                        "contact_person": v.contact_person or "-",
                        "category": v.category or "-"
                    }
                    for v in vends
                ]
            }

        elif tool_name == "get_invoices":
            st = args.get("status", "All")
            filter_status = None if st == "All" else st
            limit = int(args.get("limit", 10))
            invs, total = await self.inv_repo.list_paginated(
                user_id=self.user_id,
                status=filter_status,
                page=1,
                page_size=limit
            )
            return {
                "total_invoices": total,
                "invoices": [
                    {
                        "invoice_number": inv.invoice_number,
                        "customer": inv.customer.name if inv.customer else "-",
                        "issue_date": str(inv.issue_date),
                        "due_date": str(inv.due_date),
                        "total_amount": str(inv.total_amount),
                        "formatted_total": format_currency_inr(inv.total_amount),
                        "balance_due": str(inv.balance_due),
                        "formatted_balance": format_currency_inr(inv.balance_due),
                        "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status)
                    }
                    for inv in invs
                ]
            }

        elif tool_name == "get_overdue_invoices":
            today = date.today()
            stmt = (
                select(Invoice)
                .options(selectinload(Invoice.customer))
                .where(
                    Invoice.user_id == self.user_id,
                    Invoice.due_date < today,
                    Invoice.balance_due > Decimal("0.00"),
                    Invoice.status != "Cancelled"
                )
            )
            res = await self.session.execute(stmt)
            overdue_list = list(res.scalars().all())
            return {
                "count": len(overdue_list),
                "invoices": [
                    {
                        "invoice_number": inv.invoice_number,
                        "customer": inv.customer.name if inv.customer else "-",
                        "balance_due": str(inv.balance_due),
                        "formatted_balance": format_currency_inr(inv.balance_due),
                        "due_date": str(inv.due_date)
                    }
                    for inv in overdue_list
                ]
            }

        elif tool_name == "get_payment_summaries":
            limit = int(args.get("limit", 10))
            payments, total = await self.pay_repo.list_paginated(user_id=self.user_id, page=1, page_size=limit)
            return {
                "total_payments_count": total,
                "payments": [
                    {
                        "id": p.id,
                        "invoice_id": p.invoice_id,
                        "payment_date": str(p.payment_date),
                        "amount": str(p.amount),
                        "formatted_amount": format_currency_inr(p.amount),
                        "payment_method": p.payment_method.value if hasattr(p.payment_method, "value") else str(p.payment_method),
                        "reference_number": p.reference_number or "-"
                    }
                    for p in payments
                ]
            }

        elif tool_name == "get_financial_summary":
            s = parse_d(args.get("start_date"))
            e = parse_d(args.get("end_date"))
            inc = await self.tx_repo.get_total_sum(self.user_id, "income", s, e, currency)
            exp = await self.tx_repo.get_total_sum(self.user_id, "expense", s, e, currency)
            net = calculate_net_cashflow(inc, exp)
            return {
                "currency": currency,
                "total_income": str(inc),
                "formatted_income": format_currency_inr(inc),
                "total_expenses": str(exp),
                "formatted_expenses": format_currency_inr(exp),
                "net_cashflow": str(net),
                "formatted_net_cashflow": format_currency_inr(net),
                "start_date": str(s) if s else None,
                "end_date": str(e) if e else None
            }

        elif tool_name == "compare_periods":
            c_s = parse_d(args.get("current_start"))
            c_e = parse_d(args.get("current_end"))
            p_s = parse_d(args.get("previous_start"))
            p_e = parse_d(args.get("previous_end"))
            tx_type = args.get("type", "expense")

            cur_tot = await self.tx_repo.get_total_sum(self.user_id, tx_type, c_s, c_e, currency)
            prev_tot = await self.tx_repo.get_total_sum(self.user_id, tx_type, p_s, p_e, currency)
            pct = calculate_percentage_change(cur_tot, prev_tot)
            return {
                "type": tx_type,
                "currency": currency,
                "current_amount": str(cur_tot),
                "formatted_current": format_currency_inr(cur_tot),
                "previous_amount": str(prev_tot),
                "formatted_previous": format_currency_inr(prev_tot),
                "percentage_change": str(pct) + "%"
            }

        return {"error": f"Unknown tool: {tool_name}"}
