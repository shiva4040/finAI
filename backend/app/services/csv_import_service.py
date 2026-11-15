import io
import csv
import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.transaction import Transaction
from app.models.category import Category
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.notification_repo import NotificationRepository
from app.schemas.csv_import import (
    CSVPreviewResponse,
    CSVColumnMapping,
    CSVImportRowError,
    CSVImportResponse,
)
from app.utils.money import money_decimal
from app.core.exceptions import ValidationException


def detect_encoding(raw_bytes: bytes) -> str:
    """Detects encoding safely, prioritizing UTF-8 and handling BOM."""
    if raw_bytes.startswith(b'\xef\xbb\xbf'):
        return 'utf-8-sig'
    try:
        raw_bytes.decode('utf-8')
        return 'utf-8'
    except UnicodeDecodeError:
        try:
            raw_bytes.decode('latin-1')
            return 'latin-1'
        except Exception:
            return 'cp1252'


def detect_delimiter(sample_text: str) -> str:
    """Sniffs delimiter prioritizing comma, semicolon, tab."""
    lines = [line for line in sample_text.splitlines() if line.strip()][:5]
    if not lines:
        return ','
    
    delimiters = [',', ';', '\t']
    counts = {d: 0 for d in delimiters}
    
    for d in delimiters:
        counts[d] = sum(line.count(d) for line in lines)
    
    best_delimiter = max(counts, key=counts.get)
    return best_delimiter if counts[best_delimiter] > 0 else ','


def parse_flexible_date(date_str: str) -> Optional[date]:
    """Parses various date formats commonly found in financial CSV exports."""
    if not date_str:
        return None
    cleaned = date_str.strip()
    
    # Try ISO YYYY-MM-DD
    try:
        return date.fromisoformat(cleaned)
    except Exception:
        pass
    
    formats = [
        "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d",
        "%d.%m.%Y", "%Y.%m.%d", "%d %b %Y", "%d %B %Y",
        "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def parse_flexible_amount(amt_str: str) -> Optional[Decimal]:
    """Cleans currency symbols, thousand separators, and parses into Decimal."""
    if not amt_str:
        return None
    cleaned = str(amt_str).strip()
    # Remove currency symbols and spaces
    cleaned = re.sub(r'[₹$€£\s]', '', cleaned)
    
    # Check parenthesized negatives like (1,500.00)
    is_negative = False
    if cleaned.startswith('(') and cleaned.endswith(')'):
        is_negative = True
        cleaned = cleaned[1:-1].strip()
    elif cleaned.startswith('-'):
        is_negative = True
        cleaned = cleaned[1:].strip()
        
    # If commas exist, determine if European decimal or thousand separator
    if ',' in cleaned and '.' in cleaned:
        # e.g. 1,250.50 -> remove comma
        if cleaned.rfind('.') > cleaned.rfind(','):
            cleaned = cleaned.replace(',', '')
        else: # e.g. 1.250,50 -> swap
            cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        # e.g. 1,250 or 1250,50
        parts = cleaned.split(',')
        if len(parts) == 2 and len(parts[1]) == 2:
            cleaned = cleaned.replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')
            
    try:
        d = money_decimal(cleaned)
        return -d if is_negative else d
    except Exception:
        return None


class CSVImportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tx_repo = TransactionRepository(session)
        self.cat_repo = CategoryRepository(session)
        self.notif_repo = NotificationRepository(session)

    def preview_csv(self, file_bytes: bytes, max_rows: int = 15) -> CSVPreviewResponse:
        """Parses CSV headers and preview rows with delimiter & encoding auto-detection."""
        encoding = detect_encoding(file_bytes)
        text = file_bytes.decode(encoding, errors='replace')
        delimiter = detect_delimiter(text[:4096])
        
        reader = csv.reader(io.StringIO(text), delimiter=delimiter)
        rows = []
        headers = []
        
        try:
            headers = [h.strip() for h in next(reader, [])]
        except Exception as e:
            raise ValidationException(f"Failed to read CSV header: {str(e)}")
            
        if not headers:
            raise ValidationException("The uploaded CSV file is empty or missing headers.")
            
        for row in reader:
            if any(cell.strip() for cell in row):
                rows.append([cell.strip() for cell in row])
                
        return CSVPreviewResponse(
            delimiter=delimiter,
            encoding=encoding,
            headers=headers,
            sample_rows=rows[:max_rows],
            total_rows=len(rows)
        )

    async def import_transactions(
        self,
        user_id: str,
        file_bytes: bytes,
        mapping: CSVColumnMapping
    ) -> CSVImportResponse:
        """
        Executes safe, transactional batch import of CSV transactions for authenticated user.
        Validates amounts, dates, types, categories, and skips duplicates atomically.
        """
        encoding = detect_encoding(file_bytes)
        text = file_bytes.decode(encoding, errors='replace')
        delimiter = detect_delimiter(text[:4096])
        
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        fieldnames = [f.strip() for f in (reader.fieldnames or [])]
        
        # Verify required mapped fields exist in CSV
        for req_field, mapped_col in [('date', mapping.date), ('description', mapping.description), ('amount', mapping.amount)]:
            if mapped_col not in fieldnames:
                raise ValidationException(f"Mapped column '{mapped_col}' for '{req_field}' does not exist in CSV headers: {fieldnames}")
                
        # Cache existing categories for fast mapping
        user_categories = await self.cat_repo.list_for_user(user_id)
        cat_map = {c.name.strip().lower(): c for c in user_categories}
        
        imported_txs: List[Transaction] = []
        errors: List[CSVImportRowError] = []
        duplicates_skipped = 0
        row_num = 1  # 1-based, row 1 is header
        
        for raw_row in reader:
            row_num += 1
            if not any(v.strip() for v in raw_row.values() if v):
                continue  # Skip completely blank lines
                
            raw_date = raw_row.get(mapping.date, "").strip()
            raw_desc = raw_row.get(mapping.description, "").strip()
            raw_amt = raw_row.get(mapping.amount, "").strip()
            raw_type = raw_row.get(mapping.type, "").strip() if mapping.type else None
            raw_cat = raw_row.get(mapping.category, "").strip() if mapping.category else None
            raw_method = raw_row.get(mapping.payment_method, "").strip() if mapping.payment_method else None
            raw_ref = raw_row.get(mapping.reference, "").strip() if mapping.reference else None
            
            # 1. Validate Date
            parsed_date = parse_flexible_date(raw_date)
            if not parsed_date:
                errors.append(CSVImportRowError(row_number=row_num, reason=f"Invalid date format: '{raw_date}'", raw_data=raw_row))
                continue
                
            # 2. Validate Description
            if not raw_desc:
                errors.append(CSVImportRowError(row_number=row_num, reason="Description cannot be empty", raw_data=raw_row))
                continue
                
            # 3. Validate Amount
            parsed_amt = parse_flexible_amount(raw_amt)
            if parsed_amt is None:
                errors.append(CSVImportRowError(row_number=row_num, reason=f"Invalid monetary amount: '{raw_amt}'", raw_data=raw_row))
                continue
                
            # 4. Resolve Transaction Type
            final_type = None
            if raw_type:
                low_type = raw_type.lower()
                if "inc" in low_type or "credit" in low_type or "deposit" in low_type:
                    final_type = "income"
                elif "exp" in low_type or "debit" in low_type or "payment" in low_type:
                    final_type = "expense"
            
            if not final_type:
                # If amount is explicitly negative and no type given, treat as expense
                if parsed_amt < Decimal("0.00"):
                    final_type = "expense"
                    parsed_amt = abs(parsed_amt)
                else:
                    final_type = (mapping.default_type or "expense").lower()
            else:
                parsed_amt = abs(parsed_amt)
                
            if parsed_amt <= Decimal("0.00"):
                errors.append(CSVImportRowError(row_number=row_num, reason="Amount must be greater than zero", raw_data=raw_row))
                continue
                
            # 5. Resolve Category
            category_id = None
            if raw_cat:
                cat_key = raw_cat.strip().lower()
                if cat_key in cat_map:
                    category_id = cat_map[cat_key].id
                else:
                    # Dynamically create category for user
                    new_cat = await self.cat_repo.create(
                        user_id=user_id,
                        name=raw_cat.strip(),
                        category_type=final_type,
                        color="#6366F1",
                        icon="Layers"
                    )
                    cat_map[cat_key] = new_cat
                    category_id = new_cat.id
                    
            # 6. Check Duplicate
            stmt = select(Transaction).where(
                Transaction.user_id == user_id,
                Transaction.transaction_date == parsed_date,
                Transaction.amount == parsed_amt,
                Transaction.description == raw_desc[:255],
                Transaction.type == final_type,
                Transaction.is_deleted == False
            )
            dup_res = await self.session.execute(stmt)
            if dup_res.scalars().first():
                duplicates_skipped += 1
                continue
                
            # 7. Create Transaction Model
            tx = Transaction(
                user_id=user_id,
                category_id=category_id,
                type=final_type,
                amount=parsed_amt,
                currency=mapping.default_currency or "INR",
                description=raw_desc[:255],
                transaction_date=parsed_date,
                payment_method=raw_method or "bank_transfer",
                reference=raw_ref[:100] if raw_ref else None,
                notes=f"Imported from CSV row {row_num}",
                source="csv_import"
            )
            self.session.add(tx)
            imported_txs.append(tx)

        # Commit all imported transactions in a single transaction
        if imported_txs:
            await self.session.commit()
            for tx in imported_txs:
                await self.session.refresh(tx)
                
        imported_count = len(imported_txs)
        total_processed = row_num - 1
        
        # 8. Create Persistent Notification Record
        if imported_count > 0:
            await self.notif_repo.create(
                user_id=user_id,
                type="csv_import",
                title="CSV Import Completed",
                message=f"Successfully imported {imported_count} transaction(s). {duplicates_skipped} duplicates skipped.",
                is_read=False
            )
            await self.session.commit()
        elif errors:
            await self.notif_repo.create(
                user_id=user_id,
                type="csv_import",
                title="CSV Import Failed",
                message=f"CSV import processed {total_processed} rows with {len(errors)} error(s) and 0 imported.",
                is_read=False
            )
            await self.session.commit()
            
        return CSVImportResponse(
            success=imported_count > 0 or (duplicates_skipped > 0 and not errors),
            total_rows=total_processed,
            imported_count=imported_count,
            duplicates_skipped=duplicates_skipped,
            rejected_count=len(errors),
            errors=errors,
            imported_ids=[t.id for t in imported_txs]
        )
