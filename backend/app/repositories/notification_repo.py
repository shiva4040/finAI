from typing import List, Optional, Tuple
from sqlalchemy import select, and_, desc, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Notification:
        notif = Notification(**kwargs)
        self.session.add(notif)
        await self.session.flush()
        return notif

    async def exists_by_reference(self, user_id: str, notif_type: str, reference_id: str) -> bool:
        stmt = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.type == notif_type,
            Notification.reference_id == reference_id
        )
        res = await self.session.execute(stmt)
        return (res.scalar() or 0) > 0

    async def get_by_id(self, notif_id: str, user_id: str) -> Optional[Notification]:
        stmt = select(Notification).where(
            Notification.id == notif_id,
            Notification.user_id == user_id
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_paginated(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Notification], int, int]:
        base_cond = [Notification.user_id == user_id]

        # Total count
        count_stmt = select(func.count()).select_from(Notification).where(and_(*base_cond))
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar() or 0

        # Unread count
        unread_stmt = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
        unread_res = await self.session.execute(unread_stmt)
        unread_count = unread_res.scalar() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Notification)
            .where(and_(*base_cond))
            .order_by(Notification.is_read.asc(), desc(Notification.created_at))
            .offset(offset)
            .limit(page_size)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all()), total, unread_count

    async def mark_read(self, notif: Notification) -> Notification:
        notif.is_read = True
        await self.session.flush()
        return notif

    async def mark_all_read(self, user_id: str) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount

    async def delete(self, notif: Notification) -> None:
        await self.session.delete(notif)
        await self.session.flush()

    async def clear_all(self, user_id: str) -> int:
        from sqlalchemy import delete
        stmt = delete(Notification).where(Notification.user_id == user_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount
