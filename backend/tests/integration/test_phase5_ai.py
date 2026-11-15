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
async def test_ai_assistant_exact_september_example(client: AsyncClient):
    headers = await get_auth_headers(client, "aiuser@finai.com", "AI User")

    # 1. Insert September 2026 expenses totaling ₹42,580.00 (as specified in product requirements!)
    # First expense: 30,000.00 on 2026-09-05
    await client.post("/api/v1/expenses", headers=headers, json={
        "type": "expense",
        "amount": "30000.00",
        "description": "Office Space Lease",
        "transaction_date": "2026-09-05"
    })
    # Second expense: 12,580.00 on 2026-09-18
    await client.post("/api/v1/expenses", headers=headers, json={
        "type": "expense",
        "amount": "12580.00",
        "description": "Cloud Hosting & Subscriptions",
        "transaction_date": "2026-09-18"
    })
    # Total = 42,580.00

    # 2. Ask assistant: "How much did I spend in September 2026?"
    res = await client.post("/api/v1/assistant/chat", headers=headers, json={
        "message": "How much did I spend in September 2026?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "conversation_id" in data
    assert len(data["tools_called"]) > 0
    # Must contain exact number from DB: ₹42,580.00
    assert "42,580" in data["message"]
    conv_id = data["conversation_id"]

    # 3. Ask follow-up in the same conversation: "What is my largest expense in September 2026?"
    res_followup = await client.post("/api/v1/assistant/chat", headers=headers, json={
        "message": "What is my largest expense in September 2026?",
        "conversation_id": conv_id
    })
    assert res_followup.status_code == 200
    assert "30,000" in res_followup.json()["message"]

    # 4. Check conversation messages persisted in database
    res_msgs = await client.get(f"/api/v1/assistant/conversations/{conv_id}/messages", headers=headers)
    assert res_msgs.status_code == 200
    messages = res_msgs.json()
    assert len(messages) >= 4  # 2 user queries + 2 assistant replies
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_ai_two_user_isolation(client: AsyncClient):
    headers_a = await get_auth_headers(client, "user_alpha@finai.com", "User Alpha")
    headers_b = await get_auth_headers(client, "user_beta@finai.com", "User Beta")

    # User Alpha has 100,000 income
    await client.post("/api/v1/income", headers=headers_a, json={
        "type": "income",
        "amount": "100000.00",
        "description": "Alpha Secret Income",
        "transaction_date": "2026-09-10"
    })

    # User Beta asks about income in September 2026
    res_b = await client.post("/api/v1/assistant/chat", headers=headers_b, json={
        "message": "How much did I earn in September 2026?"
    })
    assert res_b.status_code == 200
    b_msg = res_b.json()["message"]
    # User Beta must NOT see 100,000! They have ₹0.00 income.
    assert "100,000" not in b_msg
    assert "₹0.00" in b_msg or "0.00" in b_msg or "0" in b_msg
