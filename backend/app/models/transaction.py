import uuid
from decimal import Decimal
from datetime import datetime, date, timezone
from sqlalchemy import String, Boolean, DateTime, Date, Numeric, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index("ix_transactions_user_type_date", "user_id", "type", "transaction_date"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # 'income' or 'expense'
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    payment_method: Mapped[str] = mapped_column(String(50), default="bank_transfer", nullable=False)  # cash, bank_transfer, card, UPI, other
    reference: Mapped[str] = mapped_column(String(100), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="manual", nullable=False)  # manual, invoice_payment
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
