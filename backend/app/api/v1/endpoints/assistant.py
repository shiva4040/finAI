from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    MessageResponse,
    ConversationUpdate,
)
from app.schemas.auth import GenericMessageResponse
from app.repositories.conversation_repo import ConversationRepository
from app.ai.assistant import FinancialAssistant
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/assistant", tags=["AI Financial Assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Ask financial questions in natural language.
    Answers are computed using actual database records via controlled tool-calling.
    """
    assistant = FinancialAssistant(session=session, user_id=current_user.id)
    return await assistant.chat(
        message=req.message,
        conversation_id=req.conversation_id,
        currency=req.currency or "INR"
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    repo = ConversationRepository(session)
    convs = await repo.list_conversations(user_id=current_user.id, limit=limit)
    return [ConversationResponse.model_validate(c) for c in convs]


@router.get("/conversations/{id}", response_model=ConversationResponse)
async def get_conversation(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    repo = ConversationRepository(session)
    conv = await repo.get_conversation(conversation_id=id, user_id=current_user.id)
    if not conv:
        raise NotFoundException("Conversation", id)
    return ConversationResponse.model_validate(conv)


@router.get("/conversations/{id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    repo = ConversationRepository(session)
    conv = await repo.get_conversation(conversation_id=id, user_id=current_user.id)
    if not conv:
        raise NotFoundException("Conversation", id)
    messages = await repo.get_messages(conversation_id=id, limit=limit)
    return [MessageResponse.model_validate(m) for m in messages]


@router.patch("/conversations/{id}", response_model=ConversationResponse)
async def update_conversation(
    id: str,
    req: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    repo = ConversationRepository(session)
    conv = await repo.get_conversation(conversation_id=id, user_id=current_user.id)
    if not conv:
        raise NotFoundException("Conversation", id)
    updated = await repo.update_title(conv, req.title.strip())
    await session.commit()
    return ConversationResponse.model_validate(updated)


@router.delete("/conversations/{id}", response_model=GenericMessageResponse)
async def delete_conversation(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    repo = ConversationRepository(session)
    conv = await repo.get_conversation(conversation_id=id, user_id=current_user.id)
    if not conv:
        raise NotFoundException("Conversation", id)
    await repo.delete_conversation(conv)
    await session.commit()
    return GenericMessageResponse(message="Conversation deleted successfully")
