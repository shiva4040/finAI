import pytest
import io
from decimal import Decimal
from datetime import date
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.csv_import_service import CSVImportService
from app.schemas.csv_import import CSVColumnMapping
from app.models.transaction import Transaction
from app.models.notification import Notification
from app.core.exceptions import ValidationException


@pytest.mark.asyncio
async def test_csv_1_comma_separated(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = """Date,Description,Amount,Type,Category
2026-11-01,Client Retainer Acme,45000.00,income,Client Retainer
2026-11-02,AWS Cloud Hosting,12500.50,expense,Cloud Infrastructure
""".encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount", type="Type", category="Category")
    res = await service.import_transactions(test_user.id, csv_content, mapping)

    assert res.success is True
    assert res.imported_count == 2
    assert res.duplicates_skipped == 0
    assert res.rejected_count == 0


@pytest.mark.asyncio
async def test_csv_2_semicolon_separated(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = """Date;Description;Amount;Type;Category
2026-11-03;Office Internet Lease;4800,00;expense;Operations
2026-11-04;Consulting Advisory Yield;18000,00;income;Advisory
""".encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount", type="Type", category="Category")
    res = await service.import_transactions(test_user.id, csv_content, mapping)

    assert res.success is True
    assert res.imported_count == 2


@pytest.mark.asyncio
async def test_csv_3_utf8_bom(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    bom = b'\xef\xbb\xbf'
    csv_text = """Date,Description,Amount,Type
2026-11-05,BOM Encoded Inflow,32000,income
""".encode('utf-8')
    csv_content = bom + csv_text

    preview = service.preview_csv(csv_content)
    assert preview.encoding == 'utf-8-sig'

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount", type="Type")
    res = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res.imported_count == 1


@pytest.mark.asyncio
async def test_csv_4_quoted_descriptions_with_commas(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = '''Date,Description,Amount,Type
2026-11-06,"Annual SaaS License, Tier 3, Unlimited Seats",75000.00,income
2026-11-07,"Hardware repair, replacement of cooling fan, rack #2",3400.00,expense
'''.encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount", type="Type")
    res = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res.imported_count == 2


@pytest.mark.asyncio
async def test_csv_5_missing_columns(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = """Date,Notes
2026-11-08,Some note without amount
""".encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount")
    with pytest.raises(ValidationException):
        await service.import_transactions(test_user.id, csv_content, mapping)


@pytest.mark.asyncio
async def test_csv_6_invalid_dates(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = """Date,Description,Amount
invalid-date-format,Invalid Date Item,1500.00
2026-11-09,Valid Date Item,2500.00
""".encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount")
    res = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res.imported_count == 1
    assert res.rejected_count == 1
    assert "Invalid date format" in res.errors[0].reason


@pytest.mark.asyncio
async def test_csv_7_invalid_amounts(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = """Date,Description,Amount
2026-11-10,Non numeric amount,not_a_number
2026-11-10,Zero amount item,0.00
2026-11-10,Valid numeric amount,12000.00
""".encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount")
    res = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res.imported_count == 1
    assert res.rejected_count == 2


@pytest.mark.asyncio
async def test_csv_8_duplicate_records(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = """Date,Description,Amount,Type
2026-11-11,Unique Duplicate Test Item,9999.00,expense
""".encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount", type="Type")
    # First import
    res1 = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res1.imported_count == 1
    assert res1.duplicates_skipped == 0

    # Second import with same item
    res2 = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res2.imported_count == 0
    assert res2.duplicates_skipped == 1


@pytest.mark.asyncio
async def test_csv_9_empty_csv(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    with pytest.raises(ValidationException):
        service.preview_csv(b"")


@pytest.mark.asyncio
async def test_csv_10_large_csv(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    lines = ["Date,Description,Amount,Type"]
    for i in range(1, 101):
        lines.append(f"2026-10-01,Bulk Ledger Item #{i},{100 + i}.00,expense")
    csv_content = "\n".join(lines).encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount", type="Type")
    res = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res.imported_count == 100
    assert res.rejected_count == 0


@pytest.mark.asyncio
async def test_csv_11_unicode_descriptions(db_session: AsyncSession, test_user):
    service = CSVImportService(db_session)
    csv_content = """Date,Description,Amount,Type
2026-11-12,München Server Zentrum Überweisung,8400.00,expense
2026-11-12,Tokyo 東京支店 コンサルティング,95000.00,income
2026-11-12,Bengaluru कार्यालय भाड़ा,15000.00,expense
""".encode('utf-8')

    mapping = CSVColumnMapping(date="Date", description="Description", amount="Amount", type="Type")
    res = await service.import_transactions(test_user.id, csv_content, mapping)
    assert res.imported_count == 3
    assert res.rejected_count == 0
