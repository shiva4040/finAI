import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    date_format: Mapped[str] = mapped_column(String(20), default="YYYY-MM-DD", nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    theme: Mapped[str] = mapped_column(String(10), default="dark", nullable=False)
    notification_preferences: Mapped[str] = mapped_column(Text, default='{"email": true, "push": true, "invoice_reminders": true}', nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="preference")
