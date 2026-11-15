import pytest
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.utils.money import (
    money_decimal,
    calculate_tax,
    calculate_discount,
    calculate_invoice_total,
    calculate_balance_due,
    calculate_net_cashflow,
    calculate_percentage_change,
    format_currency_inr,
)


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == settings.APP_NAME


@pytest.mark.asyncio
async def test_ready_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"


def test_money_decimal_precision():
    # Never float inaccuracies
    assert money_decimal("100.505") == Decimal("100.51")
    assert money_decimal(100) == Decimal("100.00")
    assert money_decimal(None) == Decimal("0.00")
    assert money_decimal("0.1") + money_decimal("0.2") == Decimal("0.30")


def test_calculate_tax():
    # 18% GST on 1000
    tax = calculate_tax(Decimal("1000.00"), Decimal("18.00"))
    assert tax == Decimal("180.00")


def test_calculate_discount():
    # Flat discount
    assert calculate_discount(Decimal("1000.00"), Decimal("150.00"), is_percentage=False) == Decimal("150.00")
    # Percentage discount
    assert calculate_discount(Decimal("1000.00"), Decimal("10.00"), is_percentage=True) == Decimal("100.00")
    # Max discount capped at base amount
    assert calculate_discount(Decimal("500.00"), Decimal("600.00"), is_percentage=False) == Decimal("500.00")


def test_calculate_invoice_total():
    items = [
        {"quantity": "2", "unit_price": "500.00", "tax_rate": "18.0", "discount_amount": "50.00"},
        {"quantity": "1", "unit_price": "2000.00", "tax_rate": "12.0", "discount_amount": "0.00"},
    ]
    # Item 1: base = 1000, tax = 180, item disc = 50
    # Item 2: base = 2000, tax = 240, item disc = 0
    # Subtotal = 3000, Tax Total = 420, Discount Total = 50 + 100 (invoice level) = 150
    # Grand Total = 3000 + 420 - 150 = 3270
    res = calculate_invoice_total(items, invoice_level_discount=Decimal("100.00"))
    assert res["subtotal"] == Decimal("3000.00")
    assert res["tax_total"] == Decimal("420.00")
    assert res["discount_total"] == Decimal("150.00")
    assert res["total"] == Decimal("3270.00")


def test_calculate_balance_due():
    assert calculate_balance_due(Decimal("3270.00"), Decimal("1000.00")) == Decimal("2270.00")
    assert calculate_balance_due(Decimal("3270.00"), Decimal("3270.00")) == Decimal("0.00")


def test_calculate_net_cashflow():
    assert calculate_net_cashflow(Decimal("50000.00"), Decimal("20000.00")) == Decimal("30000.00")
    assert calculate_net_cashflow(Decimal("15000.00"), Decimal("20000.00")) == Decimal("-5000.00")


def test_calculate_percentage_change():
    # 20% increase
    assert calculate_percentage_change(Decimal("120.00"), Decimal("100.00")) == Decimal("20.00")
    # 50% decrease
    assert calculate_percentage_change(Decimal("50.00"), Decimal("100.00")) == Decimal("-50.00")
    # Previous was 0
    assert calculate_percentage_change(Decimal("100.00"), Decimal("0.00")) == Decimal("100.00")
    assert calculate_percentage_change(Decimal("0.00"), Decimal("0.00")) == Decimal("0.00")


def test_format_currency_inr():
    assert format_currency_inr(Decimal("42580.00")) == "₹42,580.00"
    assert format_currency_inr(Decimal("1234567.89")) == "₹12,34,567.89"
    assert format_currency_inr(Decimal("-500.50")) == "-₹500.50"
