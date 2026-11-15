from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, PaginatedNotificationResponse
from app.schemas.auth import GenericMessageResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=PaginatedNotificationResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = NotificationService(session)
    result = await service.list_notifications(user_id=current_user.id, page=page, page_size=page_size)
    return PaginatedNotificationResponse(
        items=[NotificationResponse.model_validate(n) for n in result["items"]],
        total=result["total"],
        unread_count=result["unread_count"],
        page=result["page"],
        page_size=result["page_size"]
    )


@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = NotificationService(session)
    updated = await service.mark_read(notif_id=id, user_id=current_user.id)
    return NotificationResponse.model_validate(updated)


@router.post("/read-all", response_model=GenericMessageResponse)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = NotificationService(session)
    count = await service.mark_all_read(user_id=current_user.id)
    return GenericMessageResponse(message=f"Marked {count} notifications as read")


@router.delete("/clear-all", response_model=GenericMessageResponse)
async def clear_all_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = NotificationService(session)
    count = await service.clear_all(user_id=current_user.id)
    return GenericMessageResponse(message=f"Cleared {count} notifications")


@router.delete("/{id}", response_model=GenericMessageResponse)
async def delete_notification(
    id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = NotificationService(session)
    await service.delete_notification(notif_id=id, user_id=current_user.id)
    return GenericMessageResponse(message="Notification deleted successfully")


@router.post("/check-overdue", response_model=GenericMessageResponse)
async def check_overdue_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    service = NotificationService(session)
    created = await service.check_and_create_overdue_notifications(user_id=current_user.id)
    return GenericMessageResponse(message=f"Scanned invoices. Generated {created} new overdue notification(s).")
