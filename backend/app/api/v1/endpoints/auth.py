from typing import Any, Dict
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    LogoutRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    GenericMessageResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    session: AsyncSession = Depends(get_db)
):
    """Register a new user account with secure Argon2 password hashing."""
    service = AuthService(session)
    result = await service.register(name=req.name, email=req.email, password=req.password)
    user = result["user"]
    tokens = result["tokens"]
    return {
        "success": True,
        "user": UserResponse.model_validate(user),
        "tokens": TokenResponse(**tokens)
    }


@router.post("/login", response_model=Dict[str, Any])
async def login(
    req: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_db)
):
    """Authenticate a user and return access & refresh tokens."""
    client_ip = request.client.host if request.client else "unknown"
    client_id = f"{client_ip}_{req.email}"

    service = AuthService(session)
    result = await service.login(email=req.email, password=req.password, client_id=client_id)
    user = result["user"]
    tokens = result["tokens"]
    return {
        "success": True,
        "user": UserResponse.model_validate(user),
        "tokens": TokenResponse(**tokens)
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    req: RefreshTokenRequest,
    session: AsyncSession = Depends(get_db)
):
    """Rotate an active refresh token and issue a new access token."""
    service = AuthService(session)
    tokens = await service.refresh_token(req.refresh_token)
    return TokenResponse(**tokens)


@router.post("/logout", response_model=GenericMessageResponse)
async def logout(
    req: LogoutRequest,
    session: AsyncSession = Depends(get_db)
):
    """Revoke refresh token session."""
    service = AuthService(session)
    await service.logout(req.refresh_token)
    return GenericMessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def get_current_authenticated_user(
    current_user: User = Depends(get_current_user)
):
    """Get profile of current authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post("/change-password", response_model=GenericMessageResponse)
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Change current user password and invalidate previous sessions."""
    service = AuthService(session)
    await service.change_password(
        user=current_user,
        current_password=req.current_password,
        new_password=req.new_password
    )
    return GenericMessageResponse(message="Password changed successfully")


@router.post("/forgot-password", response_model=GenericMessageResponse)
async def forgot_password(
    req: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Request password reset token.
    Returns generic response to prevent email enumeration.
    """
    service = AuthService(session)
    # In production, this token is emailed. For development/testing, it creates the DB token.
    token = await service.forgot_password(req.email)
    return GenericMessageResponse(
        message="If an account exists with this email, a password reset link has been dispatched."
    )


@router.post("/reset-password", response_model=GenericMessageResponse)
async def reset_password(
    req: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db)
):
    """Reset password using a valid, unexpired reset token."""
    service = AuthService(session)
    await service.reset_password(raw_token=req.token, new_password=req.new_password)
    return GenericMessageResponse(message="Password reset successfully. You may now login.")
