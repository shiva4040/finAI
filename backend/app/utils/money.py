from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Union, Optional, List, Dict, Any
from app.core.exceptions import FinancialPrecisionError

# 2 decimal places rounding standard
TWO_PLACES = Decimal("0.01")
FOUR_PLACES = Decimal("0.0001")


def money_decimal(value: Union[str, int, float, Decimal, None], places: int = 2) -> Decimal:
    """
    Safely convert an input to a rounded Decimal.
    Never uses raw float representation directly to avoid IEEE 754 precision issues.
    """
    if value is None:
        return Decimal("0.00")
    try:
        if isinstance(value, float):
            d = Decimal(str(value))
        else:
            d = Decimal(value)
    except (InvalidOperation, TypeError, ValueError) as e:
        raise FinancialPrecisionError(f"Cannot convert {value} to monetary Decimal: {str(e)}")

    quantizer = Decimal("10") ** -places
    return d.quantize(quantizer, rounding=ROUND_HALF_UP)


def calculate_tax(amount: Decimal, tax_rate_percent: Decimal) -> Decimal:
    """
    Calculates tax amount: (amount * tax_rate_percent) / 100
    Does not round prematurely.
    """
    base = money_decimal(amount)
    rate = money_decimal(tax_rate_percent, places=4)
    tax = (base * rate) / Decimal("100")
    return money_decimal(tax, places=2)


def calculate_discount(
    amount: Decimal,
    discount_val: Decimal,
    is_percentage: bool = False
) -> Decimal:
    """
    Calculates discount amount.
    """
    base = money_decimal(amount)
    discount = money_decimal(discount_val)
    if is_percentage:
        discount_amount = (base * discount) / Decimal("100")
    else:
        discount_amount = discount
    
    # Discount cannot exceed the base amount
    if discount_amount > base:
        return base
    return money_decimal(discount_amount, places=2)


def calculate_invoice_total(
    items: List[Dict[str, Any]],
    invoice_level_discount: Decimal = Decimal("0.00")
) -> Dict[str, Decimal]:
    """
    Calculates invoice totals:
    Subtotal = sum(quantity * unit_price)
    Tax Total = sum(item tax amounts)
    Discount Total = sum(item discount amounts) + invoice_level_discount
    Grand Total = Subtotal + Tax Total - Discount Total
    """
    subtotal = Decimal("0.00")
    tax_total = Decimal("0.00")
    item_discounts = Decimal("0.00")

    for item in items:
        qty = money_decimal(item.get("quantity", 1), places=4)
        unit_price = money_decimal(item.get("unit_price", 0), places=2)
        base = qty * unit_price
        subtotal += base

        # Item tax
        item_tax_rate = money_decimal(item.get("tax_rate", 0), places=4)
        item_tax = (base * item_tax_rate) / Decimal("100")
        tax_total += item_tax

        # Item discount
        item_disc = money_decimal(item.get("discount_amount", 0), places=2)
        item_discounts += item_disc

    total_discount = item_discounts + money_decimal(invoice_level_discount, places=2)
    grand_total = subtotal + tax_total - total_discount
    if grand_total < Decimal("0.00"):
        grand_total = Decimal("0.00")

    return {
        "subtotal": money_decimal(subtotal),
        "tax_total": money_decimal(tax_total),
        "discount_total": money_decimal(total_discount),
        "total": money_decimal(grand_total)
    }


def calculate_balance_due(grand_total: Decimal, amount_paid: Decimal) -> Decimal:
    """
    Balance Due = Grand Total - Amount Paid
    """
    total = money_decimal(grand_total)
    paid = money_decimal(amount_paid)
    balance = total - paid
    return money_decimal(balance)


def calculate_net_cashflow(total_income: Decimal, total_expenses: Decimal) -> Decimal:
    """
    Net Cash Flow = Total Income - Total Expenses
    """
    inc = money_decimal(total_income)
    exp = money_decimal(total_expenses)
    return money_decimal(inc - exp)


def calculate_percentage_change(current_val: Decimal, previous_val: Decimal) -> Decimal:
    """
    Calculates percentage change: ((current - previous) / previous) * 100
    Handles zero previous period safely.
    """
    cur = money_decimal(current_val)
    prev = money_decimal(previous_val)

    if prev == Decimal("0.00"):
        if cur == Decimal("0.00"):
            return Decimal("0.00")
        return Decimal("100.00") if cur > 0 else Decimal("-100.00")

    pct = ((cur - prev) / abs(prev)) * Decimal("100")
    return money_decimal(pct, places=2)


def format_currency_inr(amount: Union[Decimal, float, int]) -> str:
    """
    Formats decimal amount in Indian Rupee format (e.g. ₹42,580.00)
    """
    d = money_decimal(amount)
    is_neg = d < 0
    d_abs = abs(d)
    int_part, dec_part = f"{d_abs:.2f}".split(".")

    # Indian numbering formatting: last 3 digits, then groups of 2 digits
    if len(int_part) <= 3:
        formatted_int = int_part
    else:
        last_three = int_part[-3:]
        remaining = int_part[:-3]
        groups = []
        while len(remaining) > 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            groups.insert(0, remaining)
        groups.append(last_three)
        formatted_int = ",".join(groups)

    result = f"₹{formatted_int}.{dec_part}"
    return f"-{result}" if is_neg else result
