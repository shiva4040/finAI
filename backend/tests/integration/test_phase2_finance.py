import pytest
from decimal import Decimal
from datetime import date
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
async def test_categories_crud_and_protection(client: AsyncClient):
    headers = await get_auth_headers(client, "catuser@finai.com", "Category Tester")

    # 1. System categories automatically available
    res_list = await client.get("/api/v1/categories", headers=headers)
    assert res_list.status_code == 200
    categories = res_list.json()
    assert len(categories) > 0
    system_cat = next(c for c in categories if c["is_system"])
    assert system_cat["is_system"] is True

    # Attempting to delete a system category must fail
    res_del_sys = await client.delete(f"/api/v1/categories/{system_cat['id']}", headers=headers)
    assert res_del_sys.status_code == 403

    # 2. Create custom category
    res_create = await client.post("/api/v1/categories", headers=headers, json={
        "name": "Cloud Hosting",
        "type": "expense",
        "icon": "server",
        "color": "#3b82f6"
    })
    assert res_create.status_code == 201
    custom_cat = res_create.json()
    assert custom_cat["name"] == "Cloud Hosting"
    assert custom_cat["is_system"] is False

    # Prevent duplicate category for same user & type
    res_dup = await client.post("/api/v1/categories", headers=headers, json={
        "name": "Cloud Hosting",
        "type": "expense"
    })
    assert res_dup.status_code == 409

    # Update custom category
    res_upd = await client.patch(f"/api/v1/categories/{custom_cat['id']}", headers=headers, json={
        "name": "Cloud & Infra"
    })
    assert res_upd.status_code == 200
    assert res_upd.json()["name"] == "Cloud & Infra"

    # Delete custom category
    res_del = await client.delete(f"/api/v1/categories/{custom_cat['id']}", headers=headers)
    assert res_del.status_code == 200


@pytest.mark.asyncio
async def test_transactions_crud_and_validation(client: AsyncClient):
    headers = await get_auth_headers(client, "txuser@finai.com", "Tx Tester")

    # Get an expense category
    cat_res = await client.get("/api/v1/categories?type=expense", headers=headers)
    cat_id = cat_res.json()[0]["id"]

    # 1. Negative or zero amount rejection
    res_zero = await client.post("/api/v1/transactions", headers=headers, json={
        "type": "expense",
        "amount": "0.00",
        "description": "Zero test",
        "transaction_date": str(date.today())
    })
    assert res_zero.status_code == 422 or res_zero.status_code == 400

    # 2. Category mismatch (income category on expense transaction)
    inc_cat_res = await client.get("/api/v1/categories?type=income", headers=headers)
    inc_cat_id = inc_cat_res.json()[0]["id"]
    res_mismatch = await client.post("/api/v1/transactions", headers=headers, json={
        "category_id": inc_cat_id,
        "type": "expense",
        "amount": "500.00",
        "description": "Mismatch test",
        "transaction_date": str(date.today())
    })
    assert res_mismatch.status_code == 400
    assert "cannot be assigned" in res_mismatch.json()["error"]["message"]

    # 3. Create valid expense
    res_tx = await client.post("/api/v1/transactions", headers=headers, json={
        "category_id": cat_id,
        "type": "expense",
        "amount": "42580.00",
        "currency": "INR",
        "description": "Server hardware upgrade",
        "transaction_date": str(date.today()),
        "payment_method": "bank_transfer",
        "reference": "TXN-998811"
    })
    assert res_tx.status_code == 201
    tx_data = res_tx.json()
    assert tx_data["amount"] == "42580.00"
    assert tx_data["description"] == "Server hardware upgrade"
    tx_id = tx_data["id"]

    # 4. Get by ID
    res_get = await client.get(f"/api/v1/transactions/{tx_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == tx_id

    # 5. Update transaction
    res_patch = await client.patch(f"/api/v1/transactions/{tx_id}", headers=headers, json={
        "description": "Updated Server hardware"
    })
    assert res_patch.status_code == 200
    assert res_patch.json()["description"] == "Updated Server hardware"

    # 6. Soft delete
    res_del = await client.delete(f"/api/v1/transactions/{tx_id}", headers=headers)
    assert res_del.status_code == 200

    # Soft-deleted transaction is not returned in listing or get
    res_get_del = await client.get(f"/api/v1/transactions/{tx_id}", headers=headers)
    assert res_get_del.status_code == 404


@pytest.mark.asyncio
async def test_income_and_expense_analytics(client: AsyncClient):
    headers = await get_auth_headers(client, "analytics@finai.com", "Analytics Tester")

    today_str = str(date.today())

    # Create 2 income transactions: 50,000 and 25,000
    await client.post("/api/v1/income", headers=headers, json={
        "type": "income",
        "amount": "50000.00",
        "description": "Client retainer",
        "transaction_date": today_str
    })
    await client.post("/api/v1/income", headers=headers, json={
        "type": "income",
        "amount": "25000.00",
        "description": "Product sale",
        "transaction_date": today_str
    })

    # Create 3 expense transactions: 15,000, 5,000, 2,000
    await client.post("/api/v1/expenses", headers=headers, json={
        "type": "expense",
        "amount": "15000.00",
        "description": "Office Rent",
        "transaction_date": today_str
    })
    await client.post("/api/v1/expenses", headers=headers, json={
        "type": "expense",
        "amount": "5000.00",
        "description": "Software Subscriptions",
        "transaction_date": today_str
    })
    await client.post("/api/v1/expenses", headers=headers, json={
        "type": "expense",
        "amount": "2000.00",
        "description": "Snacks & Refreshments",
        "transaction_date": today_str
    })

    # Test Income Summary
    inc_sum = await client.get("/api/v1/income/summary", headers=headers)
    assert inc_sum.status_code == 200
    inc_data = inc_sum.json()
    assert Decimal(str(inc_data["total"])) == Decimal("75000.00")
    assert Decimal(str(inc_data["today"])) == Decimal("75000.00")

    # Test Expense Summary
    exp_sum = await client.get("/api/v1/expenses/summary", headers=headers)
    assert exp_sum.status_code == 200
    exp_data = exp_sum.json()
    assert Decimal(str(exp_data["total"])) == Decimal("22000.00")
    assert Decimal(str(exp_data["today"])) == Decimal("22000.00")

    # Test Largest Expenses
    largest_res = await client.get("/api/v1/expenses/largest?limit=2", headers=headers)
    assert largest_res.status_code == 200
    largest = largest_res.json()
    assert len(largest) == 2
    assert Decimal(str(largest[0]["amount"])) == Decimal("15000.00")
    assert Decimal(str(largest[1]["amount"])) == Decimal("5000.00")


@pytest.mark.asyncio
async def test_two_user_data_isolation(client: AsyncClient):
    headers_a = await get_auth_headers(client, "usera@finai.com", "User A")
    headers_b = await get_auth_headers(client, "userb@finai.com", "User B")

    # User A creates a transaction
    res_a = await client.post("/api/v1/transactions", headers=headers_a, json={
        "type": "income",
        "amount": "100000.00",
        "description": "Confidential A Income",
        "transaction_date": str(date.today())
    })
    tx_a_id = res_a.json()["id"]

    # User B attempts to access User A's transaction
    res_b_get = await client.get(f"/api/v1/transactions/{tx_a_id}", headers=headers_b)
    assert res_b_get.status_code == 404

    # User B attempts to delete User A's transaction
    res_b_del = await client.delete(f"/api/v1/transactions/{tx_a_id}", headers=headers_b)
    assert res_b_del.status_code == 404

    # User B's listing does not show User A's transaction
    res_b_list = await client.get("/api/v1/transactions", headers=headers_b)
    assert res_b_list.status_code == 200
    assert res_b_list.json()["total"] == 0

    # User B's income summary is 0
    res_b_sum = await client.get("/api/v1/income/summary", headers=headers_b)
    assert res_b_sum.status_code == 200
    assert Decimal(str(res_b_sum.json()["total"])) == Decimal("0.00")
