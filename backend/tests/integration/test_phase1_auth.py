import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.token import RefreshToken, PasswordResetToken
from app.core.security import verify_password


@pytest.mark.asyncio
async def test_registration_and_argon2_hashing(client: AsyncClient, db_session: AsyncSession):
    # 1. Successful registration
    reg_payload = {
        "name": "Shiva Narayanan",
        "email": "shiva@finai.com",
        "password": "SecurePassword123!"
    }
    res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["user"]["email"] == "shiva@finai.com"
    assert "access_token" in data["tokens"]
    assert "refresh_token" in data["tokens"]

    # Verify password is never stored in plain text and is a valid Argon2 hash
    stmt = select(User).where(User.email == "shiva@finai.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()
    assert user is not None
    assert user.password_hash != "SecurePassword123!"
    assert user.password_hash.startswith("$argon2")
    assert verify_password("SecurePassword123!", user.password_hash) is True


@pytest.mark.asyncio
async def test_registration_duplicate_email(client: AsyncClient):
    payload = {
        "name": "User One",
        "email": "duplicate@finai.com",
        "password": "Password123!"
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt duplicate
    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["error"]["message"]


@pytest.mark.asyncio
async def test_registration_invalid_inputs(client: AsyncClient):
    # Invalid email
    res1 = await client.post("/api/v1/auth/register", json={
        "name": "Test",
        "email": "not-an-email",
        "password": "Password123!"
    })
    assert res1.status_code == 422

    # Weak password (missing uppercase)
    res2 = await client.post("/api/v1/auth/register", json={
        "name": "Test",
        "email": "valid@email.com",
        "password": "weakpassword1"
    })
    assert res2.status_code == 400
    assert "uppercase" in res2.json()["error"]["message"]


@pytest.mark.asyncio
async def test_login_and_wrong_password(client: AsyncClient):
    # Register
    await client.post("/api/v1/auth/register", json={
        "name": "Login Tester",
        "email": "login@finai.com",
        "password": "CorrectPassword123!"
    })

    # Wrong password
    res_wrong = await client.post("/api/v1/auth/login", json={
        "email": "login@finai.com",
        "password": "WrongPassword!"
    })
    assert res_wrong.status_code == 401

    # Correct login
    res_correct = await client.post("/api/v1/auth/login", json={
        "email": "login@finai.com",
        "password": "CorrectPassword123!"
    })
    assert res_correct.status_code == 200
    assert "access_token" in res_correct.json()["tokens"]


@pytest.mark.asyncio
async def test_protected_routes_and_me(client: AsyncClient):
    # Without token
    res_unauth = await client.get("/api/v1/auth/me")
    assert res_unauth.status_code == 401

    # Register and get token
    reg = await client.post("/api/v1/auth/register", json={
        "name": "Auth Me User",
        "email": "me@finai.com",
        "password": "Password123!"
    })
    token = reg.json()["tokens"]["access_token"]

    # Authorized request
    headers = {"Authorization": f"Bearer {token}"}
    res_auth = await client.get("/api/v1/auth/me", headers=headers)
    assert res_auth.status_code == 200
    assert res_auth.json()["email"] == "me@finai.com"


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_revocation(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "name": "Rotate User",
        "email": "rotate@finai.com",
        "password": "Password123!"
    })
    refresh_token = reg.json()["tokens"]["refresh_token"]

    # Rotate refresh token
    res_refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res_refresh.status_code == 200
    new_refresh = res_refresh.json()["refresh_token"]
    assert new_refresh != refresh_token

    # Reusing the old refresh token must be rejected (revoked)
    res_reuse = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res_reuse.status_code == 401


@pytest.mark.asyncio
async def test_logout_revocation(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "name": "Logout User",
        "email": "logout@finai.com",
        "password": "Password123!"
    })
    refresh_token = reg.json()["tokens"]["refresh_token"]

    # Logout
    res_logout = await client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert res_logout.status_code == 200

    # Refresh token must be revoked and unusable
    res_refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res_refresh.status_code == 401


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "name": "Change User",
        "email": "change@finai.com",
        "password": "OldPassword123!"
    })
    token = reg.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Incorrect current password
    res_bad = await client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "WrongPassword123!",
        "new_password": "NewPassword123!"
    })
    assert res_bad.status_code == 400

    # Successful change
    res_ok = await client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "OldPassword123!",
        "new_password": "NewPassword123!"
    })
    assert res_ok.status_code == 200

    # Login with new password works
    res_login = await client.post("/api/v1/auth/login", json={
        "email": "change@finai.com",
        "password": "NewPassword123!"
    })
    assert res_login.status_code == 200


@pytest.mark.asyncio
async def test_password_reset_flow(client: AsyncClient, db_session: AsyncSession):
    # Register user
    await client.post("/api/v1/auth/register", json={
        "name": "Reset User",
        "email": "reset@finai.com",
        "password": "OldPassword123!"
    })

    # Forgot password request
    res_forgot = await client.post("/api/v1/auth/forgot-password", json={"email": "reset@finai.com"})
    assert res_forgot.status_code == 200

    # Inspect token directly from DB for test verification
    stmt = select(PasswordResetToken)
    result = await db_session.execute(stmt)
    token_records = result.scalars().all()
    assert len(token_records) > 0
    # Create a fresh token via service to test reset
    from app.services.auth_service import AuthService
    auth_svc = AuthService(db_session)
    raw_token = await auth_svc.forgot_password("reset@finai.com")

    # Reset password with raw token
    res_reset = await client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "ResetPassword123!"
    })
    assert res_reset.status_code == 200

    # Reusing reset token fails
    res_reuse = await client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "AnotherPassword123!"
    })
    assert res_reuse.status_code == 400

    # Login with reset password works
    res_login = await client.post("/api/v1/auth/login", json={
        "email": "reset@finai.com",
        "password": "ResetPassword123!"
    })
    assert res_login.status_code == 200
