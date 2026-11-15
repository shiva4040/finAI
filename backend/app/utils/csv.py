import csv
import io
import re
from typing import List, Dict, Any


def sanitize_csv_cell(value: Any) -> Any:
    """
    Sanitizes values to prevent CSV / Spreadsheet Formula Injection.
    If a text field begins with =, +, -, @, \t, or \r and is not a standard signed number,
    prepends a single quote to neutralize formula evaluation in Excel/Sheets.
    """
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return value
    s = str(value)
    if not s:
        return s

    # If it's a signed decimal like -150.00 or +50, allow standard numeric representation
    if re.match(r"^[-+]?\d+(\.\d+)?$", s):
        return s

    # If it starts with formula triggers
    if s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s


def generate_csv(headers: List[str], rows: List[Dict[str, Any]], field_keys: List[str]) -> bytes:
    """
    Generates a UTF-8 encoded CSV with BOM for standard Excel / Sheets compatibility.
    """
    output = io.StringIO()
    # Write UTF-8 BOM
    output.write("\ufeff")

    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow([sanitize_csv_cell(h) for h in headers])

    for row in rows:
        row_vals = [sanitize_csv_cell(row.get(key, "")) for key in field_keys]
        writer.writerow(row_vals)

    csv_data = output.getvalue()
    output.close()
    return csv_data.encode("utf-8")
