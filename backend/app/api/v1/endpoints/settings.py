from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.setting import SettingResponse, SettingUpdate
from app.services.setting_service import SettingService

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = SettingService(session)
    pref = await service.get_settings(user_id=current_user.id)
    return SettingResponse.model_validate(pref)


@router.patch("", response_model=SettingResponse)
async def update_settings(
    req: SettingUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = SettingService(session)
    updated = await service.update_settings(user_id=current_user.id, data=req)
    return SettingResponse.model_validate(updated)
