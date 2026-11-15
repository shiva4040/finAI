import pytest
from decimal import Decimal
from datetime import date, timedelta
from httpx import AsyncClient


async def register_user(client: AsyncClient, email: str, name: str) -> dict:
    res = await client.post("/api/v1/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!"
    })
    token = res.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_complete_two_user_isolation(client: AsyncClient):
    headers_a = await register_user(client, "alice@isolation.com", "Alice")
    headers_b = await register_user(client, "bob@isolation.com", "Bob")

    today_str = str(date.today())

    # 1. Alice creates Category
    cat_res = await client.post("/api/v1/categories", headers=headers_a, json={
        "name": "Alice Secret Category",
        "type": "expense"
    })
    alice_cat_id = cat_res.json()["id"]

    # 2. Alice creates Customer
    cust_res = await client.post("/api/v1/customers", headers=headers_a, json={
        "name": "Alice Private Customer",
        "email": "alice_cust@private.com"
    })
    alice_cust_id = cust_res.json()["id"]

    # 3. Alice creates Vendor
    vend_res = await client.post("/api/v1/vendors", headers=headers_a, json={
        "name": "Alice Exclusive Vendor",
        "email": "alice_vend@private.com"
    })
    alice_vend_id = vend_res.json()["id"]

    # 4. Alice creates Transaction
    tx_res = await client.post("/api/v1/transactions", headers=headers_a, json={
        "category_id": alice_cat_id,
        "type": "expense",
        "amount": "85000.00",
        "description": "Alice Secret Project Supplies",
        "transaction_date": today_str
    })
    alice_tx_id = tx_res.json()["id"]

    # 5. Alice creates Invoice
    inv_res = await client.post("/api/v1/invoices", headers=headers_a, json={
        "customer_id": alice_cust_id,
        "issue_date": today_str,
        "due_date": str(date.today() + timedelta(days=14)),
        "items": [{"description": "Alice Enterprise System", "quantity": "1", "unit_price": "250000.00", "tax_rate": "18.0"}]
    })
    alice_inv_id = inv_res.json()["id"]

    # 6. Alice records Payment
    pay_res = await client.post("/api/v1/payments", headers=headers_a, json={
        "invoice_id": alice_inv_id,
        "amount": "50000.00",
        "payment_date": today_str
    })
    alice_pay_id = pay_res.json()["id"]

    # 7. Alice starts AI Conversation
    ai_res = await client.post("/api/v1/assistant/chat", headers=headers_a, json={
        "message": "Alice confidential financial strategy inquiry"
    })
    alice_conv_id = ai_res.json()["conversation_id"]

    # ==================== BOB ATTEMPTS TO BREACH ALICE'S DATA ====================

    # Attempt to read Alice's Category
    assert (await client.get(f"/api/v1/categories/{alice_cat_id}", headers=headers_b)).status_code == 404
    # Attempt to update Alice's Category
    assert (await client.patch(f"/api/v1/categories/{alice_cat_id}", headers=headers_b, json={"name": "Hacked"})).status_code == 404
    # Attempt to delete Alice's Category
    assert (await client.delete(f"/api/v1/categories/{alice_cat_id}", headers=headers_b)).status_code == 404

    # Attempt to read Alice's Customer
    assert (await client.get(f"/api/v1/customers/{alice_cust_id}", headers=headers_b)).status_code == 404
    assert (await client.patch(f"/api/v1/customers/{alice_cust_id}", headers=headers_b, json={"name": "Hacked"})).status_code == 404
    assert (await client.delete(f"/api/v1/customers/{alice_cust_id}", headers=headers_b)).status_code == 404

    # Attempt to read Alice's Vendor
    assert (await client.get(f"/api/v1/vendors/{alice_vend_id}", headers=headers_b)).status_code == 404
    assert (await client.delete(f"/api/v1/vendors/{alice_vend_id}", headers=headers_b)).status_code == 404

    # Attempt to read, update or delete Alice's Transaction
    assert (await client.get(f"/api/v1/transactions/{alice_tx_id}", headers=headers_b)).status_code == 404
    assert (await client.patch(f"/api/v1/transactions/{alice_tx_id}", headers=headers_b, json={"amount": "1.00"})).status_code == 404
    assert (await client.delete(f"/api/v1/transactions/{alice_tx_id}", headers=headers_b)).status_code == 404

    # Attempt to read Alice's Invoice or PDF
    assert (await client.get(f"/api/v1/invoices/{alice_inv_id}", headers=headers_b)).status_code == 404
    assert (await client.get(f"/api/v1/invoices/{alice_inv_id}/pdf", headers=headers_b)).status_code == 404
    assert (await client.post(f"/api/v1/invoices/{alice_inv_id}/cancel", headers=headers_b)).status_code == 404

    # Attempt to read Alice's Payment
    assert (await client.get(f"/api/v1/payments/{alice_pay_id}", headers=headers_b)).status_code == 404
    assert (await client.post(f"/api/v1/payments/{alice_pay_id}/reverse", headers=headers_b)).status_code == 404

    # Attempt to read Alice's AI Conversation
    assert (await client.get(f"/api/v1/assistant/conversations/{alice_conv_id}", headers=headers_b)).status_code == 404
    assert (await client.get(f"/api/v1/assistant/conversations/{alice_conv_id}/messages", headers=headers_b)).status_code == 404
    assert (await client.delete(f"/api/v1/assistant/conversations/{alice_conv_id}", headers=headers_b)).status_code == 404

    # Bob's Dashboard Summary should show ZERO
    bob_dash = (await client.get("/api/v1/dashboard/summary", headers=headers_b)).json()
    assert Decimal(str(bob_dash["total_income"])) == Decimal("0.00")
    assert Decimal(str(bob_dash["total_expenses"])) == Decimal("0.00")
    assert Decimal(str(bob_dash["outstanding_invoices_amount"])) == Decimal("0.00")
    assert len(bob_dash["recent_transactions"]) == 0
    assert len(bob_dash["recent_invoices"]) == 0
