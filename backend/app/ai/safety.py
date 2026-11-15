import re
from datetime import date, timedelta
from typing import Optional, Tuple
import calendar

MONTH_NAMES = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}


def parse_natural_date_range(query: str, ref_date: Optional[date] = None) -> Tuple[Optional[date], Optional[date]]:
    """
    Parses natural language date expressions from user query.
    Returns (start_date, end_date).
    """
    now = ref_date or date.today()
    q = query.lower()

    if "today" in q:
        return now, now

    if "yesterday" in q:
        y = now - timedelta(days=1)
        return y, y

    if "this week" in q:
        start = now - timedelta(days=now.weekday())
        return start, now

    if "last week" in q:
        start = now - timedelta(days=now.weekday() + 7)
        end = start + timedelta(days=6)
        return start, end

    if "this month" in q:
        start = date(now.year, now.month, 1)
        return start, now

    if "last month" in q:
        if now.month == 1:
            y = now.year - 1
            m = 12
        else:
            y = now.year
            m = now.month - 1
        _, last_d = calendar.monthrange(y, m)
        return date(y, m, 1), date(y, m, last_d)

    if "this year" in q:
        return date(now.year, 1, 1), now

    if "last year" in q:
        y = now.year - 1
        return date(y, 1, 1), date(y, 12, 31)

    # Check for Month Name (e.g., "September 2026" or "September")
    for name, month_num in MONTH_NAMES.items():
        # Match word boundary
        pattern = rf"\b{name}\b(?:\s+(\d{{4}}))?"
        match = re.search(pattern, q)
        if match:
            year_val = int(match.group(1)) if match.group(1) else now.year
            _, last_d = calendar.monthrange(year_val, month_num)
            return date(year_val, month_num, 1), date(year_val, month_num, last_d)

    return None, None
