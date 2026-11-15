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
async def test_dashboard_summary_api(client: AsyncClient):
    headers = await get_auth_headers(client, "dashuser@finai.com", "Dash User")
    today_str = str(date.today())

    # Create Income: 60,000
    await client.post("/api/v1/income", headers=headers, json={
        "type": "income",
        "amount": "60000.00",
        "description": "Tech Consulting",
        "transaction_date": today_str
    })

    # Create Expense: 20,000
    await client.post("/api/v1/expenses", headers=headers, json={
        "type": "expense",
        "amount": "20000.00",
        "description": "Office Supplies",
        "transaction_date": today_str
    })

    # Create Customer & Invoice with balance: 15,000
    cust = await client.post("/api/v1/customers", headers=headers, json={"name": "HCL Tech"})
    cust_id = cust.json()["id"]

    await client.post("/api/v1/invoices", headers=headers, json={
        "customer_id": cust_id,
        "issue_date": today_str,
        "due_date": str(date.today() + timedelta(days=10)),
        "items": [{"description": "Project Work", "quantity": "1", "unit_price": "15000.00", "tax_rate": "0.0"}]
    })

    # Call Dashboard
    res = await client.get("/api/v1/dashboard/summary?period=this_month", headers=headers)
    assert res.status_code == 200
    dash = res.json()
    assert Decimal(str(dash["total_income"])) == Decimal("60000.00")
    assert Decimal(str(dash["total_expenses"])) == Decimal("20000.00")
    assert Decimal(str(dash["net_cash_flow"])) == Decimal("40000.00")
    assert Decimal(str(dash["outstanding_invoices_amount"])) == Decimal("15000.00")
    assert len(dash["recent_transactions"]) > 0
    assert len(dash["recent_invoices"]) > 0


@pytest.mark.asyncio
async def test_eight_report_types_json_csv_pdf(client: AsyncClient):
    headers = await get_auth_headers(client, "reportuser@finai.com", "Report User")
    today_str = str(date.today())

    # Add transaction with formula injection attempt to verify sanitization
    await client.post("/api/v1/income", headers=headers, json={
        "type": "income",
        "amount": "1000.00",
        "description": "=cmd|' /C calc'!A0",  # CSV formula injection attack string
        "transaction_date": today_str
    })

    report_types = [
        "income",
        "expenses",
        "transactions",
        "categories",
        "monthly",
        "invoices",
        "customers",
        "vendors"
    ]

    for r_type in report_types:
        # 1. JSON Report
        res_json = await client.get(f"/api/v1/reports/{r_type}", headers=headers)
        assert res_json.status_code == 200, f"Failed for {r_type}"
        data = res_json.json()
        assert "header" in data
        assert "summary" in data
        assert "data" in data

        # 2. CSV Export
        res_csv = await client.get(f"/api/v1/reports/{r_type}/export/csv", headers=headers)
        assert res_csv.status_code == 200
        assert res_csv.headers["content-type"].startswith("text/csv")
        # Check formula injection sanitized (prepended with single quote)
        if r_type == "income":
            csv_text = res_csv.content.decode("utf-8")
            assert "'=cmd|" in csv_text

        # 3. PDF Export
        res_pdf = await client.get(f"/api/v1/reports/{r_type}/export/pdf", headers=headers)
        assert res_pdf.status_code == 200
        assert res_pdf.headers["content-type"] == "application/pdf"
        assert res_pdf.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_notifications_and_settings(client: AsyncClient):
    headers = await get_auth_headers(client, "notifuser@finai.com", "Notif User")

    # 1. Test Settings
    get_sett = await client.get("/api/v1/settings", headers=headers)
    assert get_sett.status_code == 200
    sett_data = get_sett.json()
    assert sett_data["currency"] == "INR"
    assert sett_data["theme"] == "dark"

    patch_sett = await client.patch("/api/v1/settings", headers=headers, json={
        "theme": "light",
        "language": "hi"
    })
    assert patch_sett.status_code == 200
    assert patch_sett.json()["theme"] == "light"
    assert patch_sett.json()["language"] == "hi"

    # 2. Test Overdue Invoices Notification Trigger
    cust = await client.post("/api/v1/customers", headers=headers, json={"name": "Overdue Customer"})
    cust_id = cust.json()["id"]

    # Past due invoice
    past_due = date.today() - timedelta(days=5)
    await client.post("/api/v1/invoices", headers=headers, json={
        "customer_id": cust_id,
        "issue_date": str(past_due - timedelta(days=10)),
        "due_date": str(past_due),
        "items": [{"description": "Past Service", "quantity": "1", "unit_price": "8000.00", "tax_rate": "0.0"}]
    })

    # Trigger scan
    scan_res = await client.post("/api/v1/notifications/check-overdue", headers=headers)
    assert scan_res.status_code == 200
    assert "Generated 1" in scan_res.json()["message"]

    # Duplicate scan is idempotent
    scan_res2 = await client.post("/api/v1/notifications/check-overdue", headers=headers)
    assert scan_res2.status_code == 200
    assert "Generated 0" in scan_res2.json()["message"]

    # List notifications
    notifs_res = await client.get("/api/v1/notifications", headers=headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert notifs["total"] >= 1
    notif_id = notifs["items"][0]["id"]
    assert notifs["items"][0]["is_read"] is False

    # Mark read
    read_res = await client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # Mark all read
    read_all_res = await client.post("/api/v1/notifications/read-all", headers=headers)
    assert read_all_res.status_code == 200
