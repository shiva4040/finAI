from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.preference import UserPreference


class PreferenceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user_id(self, user_id: str) -> UserPreference:
        stmt = select(UserPreference).where(UserPreference.user_id == user_id)
        res = await self.session.execute(stmt)
        pref = res.scalars().first()
        if not pref:
            # Create default if missing
            pref = UserPreference(
                user_id=user_id,
                currency="INR",
                date_format="YYYY-MM-DD",
                language="en",
                theme="dark"
            )
            self.session.add(pref)
            await self.session.flush()
        return pref

    async def update(self, pref: UserPreference, **kwargs) -> UserPreference:
        for k, v in kwargs.items():
            if hasattr(pref, k) and v is not None:
                setattr(pref, k, v)
        await self.session.flush()
        return pref
