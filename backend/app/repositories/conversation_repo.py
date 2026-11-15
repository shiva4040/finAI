from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import AIConversation
from app.models.message import AIMessage


class ConversationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_conversation(self, user_id: str, title: str = "New Financial Conversation") -> AIConversation:
        conv = AIConversation(user_id=user_id, title=title)
        self.session.add(conv)
        await self.session.flush()
        return conv

    async def get_conversation(self, conversation_id: str, user_id: str) -> Optional[AIConversation]:
        stmt = (
            select(AIConversation)
            .options(selectinload(AIConversation.messages))
            .where(AIConversation.id == conversation_id, AIConversation.user_id == user_id)
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_conversations(self, user_id: str, limit: int = 20) -> List[AIConversation]:
        stmt = (
            select(AIConversation)
            .where(AIConversation.user_id == user_id)
            .order_by(desc(AIConversation.updated_at))
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def update_title(self, conv: AIConversation, new_title: str) -> AIConversation:
        conv.title = new_title
        conv.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return conv

    async def delete_conversation(self, conv: AIConversation) -> None:
        await self.session.delete(conv)
        await self.session.flush()

    async def add_message(self, conversation_id: str, role: str, content: str) -> AIMessage:
        msg = AIMessage(
            conversation_id=conversation_id,
            role=role,
            content=content
        )
        self.session.add(msg)
        await self.session.flush()
        return msg

    async def get_messages(self, conversation_id: str, limit: int = 20) -> List[AIMessage]:
        stmt = (
            select(AIMessage)
            .where(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.asc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
