from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, date
from decimal import Decimal
import json
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import logger
from app.models.conversation import AIConversation
from app.repositories.conversation_repo import ConversationRepository
from app.ai.prompts import SYSTEM_FINANCIAL_ASSISTANT_PROMPT
from app.ai.tools import FINANCIAL_TOOLS_SCHEMA, FinancialToolExecutor
from app.ai.safety import parse_natural_date_range
from app.schemas.ai import ChatResponse
from app.utils.money import format_currency_inr


class FinancialAssistant:
    def __init__(self, session: AsyncSession, user_id: str):
        self.session = session
        self.user_id = user_id
        self.repo = ConversationRepository(session)
        self.executor = FinancialToolExecutor(session, user_id)
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def chat(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        currency: str = "INR"
    ) -> ChatResponse:
        # 1. Retrieve or create conversation
        if conversation_id:
            conv = await self.repo.get_conversation(conversation_id, self.user_id)
            if not conv:
                conv = await self.repo.create_conversation(self.user_id, title=message[:50])
        else:
            conv = await self.repo.create_conversation(self.user_id, title=message[:50])

        # 2. Add user message
        await self.repo.add_message(conv.id, "user", message)
        await self.session.commit()

        # 3. Retrieve recent history (max 8 messages)
        past_messages = await self.repo.get_messages(conv.id, limit=8)
        
        tools_called = []
        assistant_reply = ""

        # Check if OpenAI is available
        if self.client and settings.OPENAI_API_KEY:
            try:
                assistant_reply, tools_called = await self._run_openai_flow(past_messages, currency)
            except Exception as e:
                logger.warning(f"OpenAI API call failed or unavailable: {str(e)}. Falling back to deterministic tool execution.")
                assistant_reply, tools_called = await self._run_deterministic_flow(message, currency)
        else:
            assistant_reply, tools_called = await self._run_deterministic_flow(message, currency)

        # 4. Save assistant message
        await self.repo.add_message(conv.id, "assistant", assistant_reply)
        await self.session.commit()

        return ChatResponse(
            conversation_id=conv.id,
            message=assistant_reply,
            tools_called=tools_called,
            created_at=datetime.now(timezone.utc)
        )

    async def _run_openai_flow(self, messages_history: list, currency: str) -> tuple[str, list]:
        msgs = [{"role": "system", "content": SYSTEM_FINANCIAL_ASSISTANT_PROMPT}]
        for m in messages_history:
            msgs.append({"role": m.role, "content": m.content})

        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=msgs,
            tools=FINANCIAL_TOOLS_SCHEMA,
            tool_choice="auto"
        )
        msg_choice = response.choices[0].message
        tools_called = []

        if msg_choice.tool_calls:
            for tc in msg_choice.tool_calls:
                fn_name = tc.function.name
                fn_args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                if "currency" not in fn_args:
                    fn_args["currency"] = currency

                # Execute backend tool
                result = await self.executor.execute_tool(fn_name, fn_args)
                tools_called.append({"tool": fn_name, "args": fn_args, "result": result})

                msgs.append(msg_choice)
                msgs.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result)
                })

            # Get final answer from model
            second_resp = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=msgs
            )
            return second_resp.choices[0].message.content, tools_called

        return msg_choice.content or "I have processed your request.", tools_called

    async def _run_deterministic_flow(self, user_query: str, currency: str) -> tuple[str, list]:
        """
        Deterministic, mathematically accurate fallback analyzer that maps natural language
        intents to real database calculations when OpenAI is not configured or network is offline.
        """
        q = user_query.lower().strip()
        start_d, end_d = parse_natural_date_range(q)
        tools_called = []

        # 0. Greetings
        if q in ["hello", "hi", "hey", "greetings", "good morning", "good evening", "good afternoon"]:
            res = await self.executor.execute_tool("get_balance", {"currency": currency})
            tools_called.append({"tool": "get_balance", "result": res})
            reply = (
                f"Hello! I am your FinAI Autonomous Financial Copilot. Your current synchronized "
                f"liquid balance is {res['formatted_balance']}. How can I assist with your treasury, expenses, or invoices today?"
            )
            return reply, tools_called

        # 1. Transactions List (e.g. "Show my five latest transactions")
        if "transaction" in q or "recent entries" in q or "latest ledger" in q:
            limit = 5
            for word in q.split():
                if word.isdigit():
                    limit = int(word)
                    break
                elif word in ["five", "5"]:
                    limit = 5
                elif word in ["three", "3"]:
                    limit = 3
                elif word in ["ten", "10"]:
                    limit = 10

            args = {"limit": limit, "currency": currency}
            if start_d and end_d:
                args["start_date"] = str(start_d)
                args["end_date"] = str(end_d)

            res = await self.executor.execute_tool("get_transactions", args)
            tools_called.append({"tool": "get_transactions", "result": res})
            if res["count"] == 0:
                reply = "No transactions found in your records for this period."
            else:
                lines = [f"- **{t['date']}**: {t['description']} ({t['category']}) — {t['formatted_amount']} [{t['type'].upper()}]" for t in res["transactions"]]
                reply = f"Here are your latest {res['count']} transaction(s):\n\n" + "\n".join(lines)
            return reply, tools_called

        # 2. Overdue / Unpaid Invoices
        if "overdue" in q or "unpaid invoice" in q or "owe me" in q or "receivable" in q:
            res = await self.executor.execute_tool("get_overdue_invoices", {})
            tools_called.append({"tool": "get_overdue_invoices", "result": res})
            if res["count"] == 0:
                reply = "You currently have no overdue invoices. All customer accounts are fully settled."
            else:
                lines = [f"- **#{i['invoice_number']}** ({i['customer']}): {i['formatted_balance']} (Due: {i['due_date']})" for i in res["invoices"]]
                reply = f"You have {res['count']} overdue invoice(s) totaling outstanding balance:\n\n" + "\n".join(lines)
            return reply, tools_called

        # 3. Period Comparison
        if "compare" in q or "vs last month" in q or "growth" in q:
            from datetime import timedelta
            today = date.today()
            # Default to current month vs last month
            first_this_month = today.replace(day=1)
            last_month_end = first_this_month - timedelta(days=1)
            first_last_month = last_month_end.replace(day=1)

            tx_type = "income" if ("income" in q or "revenue" in q or "earn" in q) else "expense"
            res = await self.executor.execute_tool("compare_periods", {
                "current_start": str(first_this_month),
                "current_end": str(today),
                "previous_start": str(first_last_month),
                "previous_end": str(last_month_end),
                "type": tx_type,
                "currency": currency
            })
            tools_called.append({"tool": "compare_periods", "result": res})
            reply = (
                f"**Period Comparison ({tx_type.capitalize()})**:\n"
                f"- **This Month (MTD)**: {res['formatted_current']}\n"
                f"- **Prior Month**: {res['formatted_previous']}\n"
                f"- **Change**: {res['percentage_change']}"
            )
            return reply, tools_called

        # 4. Net Balance
        if "balance" in q or "net worth" in q or "liquidity" in q:
            res = await self.executor.execute_tool("get_balance", {"currency": currency})
            tools_called.append({"tool": "get_balance", "result": res})
            reply = (
                f"Your net liquid balance is **{res['formatted_balance']}** "
                f"(Total Lifetime Income: {format_currency_inr(Decimal(res['total_income']))}, "
                f"Total Lifetime Expenses: {format_currency_inr(Decimal(res['total_expenses']))})."
            )
            return reply, tools_called

        # 5. Largest Expenses
        if "largest" in q or "top" in q and "expense" in q:
            args = {"limit": 5, "currency": currency}
            if start_d and end_d:
                args["start_date"] = str(start_d)
                args["end_date"] = str(end_d)
            res = await self.executor.execute_tool("get_largest_expenses", args)
            tools_called.append({"tool": "get_largest_expenses", "result": res})
            if not res["expenses"]:
                reply = "No expense transactions found for the specified period."
            else:
                top_item = res["expenses"][0]
                reply = f"Your largest expense is **{top_item['formatted']}** for '{top_item['description']}' ({top_item['category']}) on {top_item['date']}."
            return reply, tools_called

        # 6. Category Expenses (e.g. "Which category has the highest expenses?")
        if "category" in q or "highest expense" in q or "spend the most" in q or "food" in q or "travel" in q:
            args = {"currency": currency}
            if start_d and end_d:
                args["start_date"] = str(start_d)
                args["end_date"] = str(end_d)
            res = await self.executor.execute_tool("get_expenses_by_category", args)
            tools_called.append({"tool": "get_expenses_by_category", "result": res})
            if not res["categories"]:
                reply = "No category expense data found in your records."
            else:
                top_cat = res["categories"][0]
                lines = [f"- **{c['category']}**: {c['formatted']} ({c['percentage']})" for c in res["categories"][:5]]
                reply = (
                    f"The category with your highest spending is **{top_cat['category']}** at **{top_cat['formatted']}** "
                    f"({top_cat['percentage']} of total expenses).\n\n**Top Categories**:\n" + "\n".join(lines)
                )
            return reply, tools_called

        # 7. Total Income
        if "earn" in q or "income" in q or "received" in q or "revenue" in q:
            args = {"currency": currency}
            if start_d and end_d:
                args["start_date"] = str(start_d)
                args["end_date"] = str(end_d)
            res = await self.executor.execute_tool("get_total_income", args)
            tools_called.append({"tool": "get_total_income", "result": res})
            period_text = f"between {start_d} and {end_d}" if start_d else "to date"
            reply = f"You earned **{res['formatted_income']}** {period_text}."
            return reply, tools_called

        # 8. Total Expenses / Spending
        if "spend" in q or "expense" in q or "cost" in q or "burn" in q:
            args = {"currency": currency}
            if start_d and end_d:
                args["start_date"] = str(start_d)
                args["end_date"] = str(end_d)
            res = await self.executor.execute_tool("get_total_expenses", args)
            tools_called.append({"tool": "get_total_expenses", "result": res})
            period_text = f"between {start_d} and {end_d}" if start_d else "to date"
            reply = f"You spent **{res['formatted_expenses']}** {period_text}."
            return reply, tools_called

        # 9. Invoices
        if "invoice" in q:
            res = await self.executor.execute_tool("get_invoices", {"limit": 5})
            tools_called.append({"tool": "get_invoices", "result": res})
            if res["total_invoices"] == 0:
                reply = "You do not have any invoices registered in your system."
            else:
                lines = [f"- **#{inv['invoice_number']}** ({inv['customer']}): Total {inv['formatted_total']}, Balance {inv['formatted_balance']} [{inv['status']}]" for inv in res["invoices"]]
                reply = f"You have {res['total_invoices']} total invoice(s):\n\n" + "\n".join(lines)
            return reply, tools_called

        # 10. Default Financial Summary
        args = {"currency": currency}
        if start_d and end_d:
            args["start_date"] = str(start_d)
            args["end_date"] = str(end_d)
        res = await self.executor.execute_tool("get_financial_summary", args)
        tools_called.append({"tool": "get_financial_summary", "result": res})
        reply = (
            f"**FinAI Financial Summary**:\n"
            f"- **Total Recognized Income**: {res['formatted_income']}\n"
            f"- **Total Operational Expenses**: {res['formatted_expenses']}\n"
            f"- **Net Operating Cash Flow**: {res['formatted_net_cashflow']}\n\n"
            f"All metrics are calculated directly from your verified ledger entries."
        )
        return reply, tools_called
