from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest, UserProfileResponse
from app.schemas.auth import ChangePasswordRequest, GenericMessageResponse
from app.repositories.user_repo import UserRepository
from app.services.auth_service import AuthService
from app.core.exceptions import ConflictException

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    user_repo = UserRepository(session)
    if req.email and req.email.lower() != current_user.email.lower():
        existing = await user_repo.get_by_email(req.email)
        if existing and existing.id != current_user.id:
            raise ConflictException("Email already taken by another account")
        current_user.email = req.email.lower()
    
    if req.name:
        current_user.name = req.name.strip()

    await user_repo.update_user(current_user)
    await session.commit()
    await session.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/me/change-password", response_model=GenericMessageResponse)
async def change_user_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = AuthService(session)
    await service.change_password(
        user=current_user,
        current_password=req.current_password,
        new_password=req.new_password
    )
    return GenericMessageResponse(message="Password changed successfully")
