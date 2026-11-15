import pytest
from decimal import Decimal
from datetime import date, timedelta
from httpx import AsyncClient


async def get_auth_headers(client: AsyncClient, email: str, name: str) -> dict:
    reg = await client.post("/api/v1/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!"
    })
    token = reg.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_customer_and_vendor_crud(client: AsyncClient):
    headers = await get_auth_headers(client, "bizuser@finai.com", "Business User")

    # 1. Create customer
    cust_res = await client.post("/api/v1/customers", headers=headers, json={
        "name": "Tata Consultancy Services",
        "email": "procurement@tcs.com",
        "company": "TCS Ltd",
        "tax_number": "27AAACT2727Q1ZW"
    })
    assert cust_res.status_code == 201
    customer = cust_res.json()
    cust_id = customer["id"]
    assert customer["name"] == "Tata Consultancy Services"

    # 2. Create vendor
    vend_res = await client.post("/api/v1/vendors", headers=headers, json={
        "name": "Amazon Web Services",
        "company": "Amazon India Cloud",
        "email": "billing@aws.amazon.com"
    })
    assert vend_res.status_code == 201
    vendor = vend_res.json()
    vend_id = vendor["id"]
    assert vendor["name"] == "Amazon Web Services"

    # 3. Vendor summary with related expense
    await client.post("/api/v1/expenses", headers=headers, json={
        "type": "expense",
        "amount": "12000.00",
        "description": "Monthly Amazon Web Services Cloud",
        "transaction_date": str(date.today())
    })
    v_sum = await client.get(f"/api/v1/vendors/{vend_id}/summary", headers=headers)
    assert v_sum.status_code == 200
    assert Decimal(str(v_sum.json()["total_spending"])) == Decimal("12000.00")
    assert v_sum.json()["expense_count"] == 1


@pytest.mark.asyncio
async def test_invoice_creation_calculation_and_pdf(client: AsyncClient):
    headers = await get_auth_headers(client, "invoiceuser@finai.com", "Invoice User")

    # Create customer
    cust = await client.post("/api/v1/customers", headers=headers, json={"name": "Infosys Ltd"})
    cust_id = cust.json()["id"]

    # Create invoice with items
    # Item 1: 2 x 1000 = 2000, 18% tax = 360, disc = 100 -> total = 2260
    # Item 2: 1 x 3000 = 3000, 12% tax = 360, disc = 0 -> total = 3360
    # Subtotal = 5000, Tax Total = 720, Discount Total = 100 + 200 (invoice level) = 300
    # Grand Total = 5000 + 720 - 300 = 5420
    inv_res = await client.post("/api/v1/invoices", headers=headers, json={
        "customer_id": cust_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=15)),
        "discount_total": "200.00",
        "items": [
            {
                "description": "Enterprise API Integration",
                "quantity": "2",
                "unit_price": "1000.00",
                "tax_rate": "18.0",
                "discount_amount": "100.00"
            },
            {
                "description": "Architecture Consultation",
                "quantity": "1",
                "unit_price": "3000.00",
                "tax_rate": "12.0",
                "discount_amount": "0.00"
            }
        ]
    })
    assert inv_res.status_code == 201
    inv = inv_res.json()
    assert inv["invoice_number"].startswith("INV-")
    assert Decimal(str(inv["subtotal"])) == Decimal("5000.00")
    assert Decimal(str(inv["tax_total"])) == Decimal("720.00")
    assert Decimal(str(inv["discount_total"])) == Decimal("300.00")
    assert Decimal(str(inv["total"])) == Decimal("5420.00")
    assert Decimal(str(inv["balance_due"])) == Decimal("5420.00")
    assert inv["status"] == "Draft"
    inv_id = inv["id"]

    # Status transition: Draft -> Sent
    send_res = await client.post(f"/api/v1/invoices/{inv_id}/send", headers=headers)
    assert send_res.status_code == 200
    assert send_res.json()["status"] == "Sent"

    # PDF Download
    pdf_res = await client.get(f"/api/v1/invoices/{inv_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_payment_recording_overpayment_and_income_sync(client: AsyncClient):
    headers = await get_auth_headers(client, "payuser@finai.com", "Payment User")

    cust = await client.post("/api/v1/customers", headers=headers, json={"name": "Wipro"})
    cust_id = cust.json()["id"]

    inv_res = await client.post("/api/v1/invoices", headers=headers, json={
        "customer_id": cust_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=30)),
        "items": [
            {"description": "AI Advisory", "quantity": "1", "unit_price": "10000.00", "tax_rate": "0.0"}
        ]
    })
    inv_id = inv_res.json()["id"]
    assert Decimal(str(inv_res.json()["balance_due"])) == Decimal("10000.00")

    # 1. Overpayment rejection
    overpay_res = await client.post("/api/v1/payments", headers=headers, json={
        "invoice_id": inv_id,
        "amount": "12000.00",
        "payment_date": str(date.today())
    })
    assert overpay_res.status_code == 400
    assert "exceeds remaining invoice balance" in overpay_res.json()["error"]["message"]

    # 2. Partial payment: ₹4,000
    part_res = await client.post("/api/v1/payments", headers=headers, json={
        "invoice_id": inv_id,
        "amount": "4000.00",
        "payment_date": str(date.today()),
        "payment_method": "UPI",
        "reference": "UPI-PART-4000"
    })
    assert part_res.status_code == 201

    # Verify invoice updated to Partially Paid and balance = 6000
    inv_check = await client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    assert inv_check.json()["status"] == "Partially Paid"
    assert Decimal(str(inv_check.json()["amount_paid"])) == Decimal("4000.00")
    assert Decimal(str(inv_check.json()["balance_due"])) == Decimal("6000.00")

    # Verify synchronized income transaction created
    inc_list = await client.get("/api/v1/income", headers=headers)
    assert inc_list.status_code == 200
    items = inc_list.json()["items"]
    assert any(Decimal(str(item["amount"])) == Decimal("4000.00") and item["source"] == "invoice_payment" for item in items)

    # 3. Final payment: ₹6,000
    full_res = await client.post("/api/v1/payments", headers=headers, json={
        "invoice_id": inv_id,
        "amount": "6000.00",
        "payment_date": str(date.today())
    })
    assert full_res.status_code == 201
    second_payment_id = full_res.json()["id"]

    inv_final = await client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    assert inv_final.json()["status"] == "Paid"
    assert Decimal(str(inv_final.json()["balance_due"])) == Decimal("0.00")

    # 4. Reverse the ₹6,000 payment
    rev_res = await client.post(f"/api/v1/payments/{second_payment_id}/reverse", headers=headers)
    assert rev_res.status_code == 200
    assert rev_res.json()["is_reversed"] is True

    # Invoice balance restored to 6000 and status returned to Partially Paid
    inv_after_rev = await client.get(f"/api/v1/invoices/{inv_id}", headers=headers)
    assert inv_after_rev.json()["status"] == "Partially Paid"
    assert Decimal(str(inv_after_rev.json()["balance_due"])) == Decimal("6000.00")
    assert Decimal(str(inv_after_rev.json()["amount_paid"])) == Decimal("4000.00")
