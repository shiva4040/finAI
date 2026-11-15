from sqlalchemy.ext.asyncio import AsyncSession

from app.models.preference import UserPreference
from app.repositories.preference_repo import PreferenceRepository
from app.schemas.setting import SettingUpdate


class SettingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = PreferenceRepository(session)

    async def get_settings(self, user_id: str) -> UserPreference:
        return await self.repo.get_by_user_id(user_id)

    async def update_settings(self, user_id: str, data: SettingUpdate) -> UserPreference:
        pref = await self.get_settings(user_id)
        fields = {}
        if data.currency is not None:
            fields["currency"] = data.currency.upper()
        if data.date_format is not None:
            fields["date_format"] = data.date_format
        if data.language is not None:
            fields["language"] = data.language
        if data.theme is not None:
            fields["theme"] = data.theme
        if data.notification_preferences is not None:
            fields["notification_preferences"] = data.notification_preferences

        updated = await self.repo.update(pref, **fields)
        await self.session.commit()
        await self.session.refresh(updated)
        return updated
