from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.preference import UserPreference
from app.models.token import RefreshToken, PasswordResetToken


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[User]:
        normalized = email.strip().lower()
        stmt = select(User).where(User.email == normalized)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(self, name: str, email: str, password_hash: str) -> User:
        user = User(
            name=name.strip(),
            email=email.strip().lower(),
            password_hash=password_hash,
            is_active=True,
            is_verified=False
        )
        self.session.add(user)
        await self.session.flush()

        # Create default preferences
        pref = UserPreference(
            user_id=user.id,
            currency="INR",
            date_format="YYYY-MM-DD",
            language="en",
            theme="dark"
        )
        self.session.add(pref)
        await self.session.flush()
        return user

    async def update_user(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        await self.session.flush()
        return user

    # Refresh Token Operations
    async def create_refresh_token(self, user_id: str, token_hash: str, expires_at: datetime) -> RefreshToken:
        token_record = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_revoked=False
        )
        self.session.add(token_record)
        await self.session.flush()
        return token_record

    async def get_refresh_token(self, token_hash: str) -> Optional[RefreshToken]:
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def revoke_refresh_token(self, token_record: RefreshToken, replaced_by: Optional[str] = None) -> None:
        token_record.is_revoked = True
        if replaced_by:
            token_record.replaced_by_token_hash = replaced_by
        await self.session.flush()

    async def revoke_all_user_tokens(self, user_id: str) -> None:
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
            .values(is_revoked=True)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    # Password Reset Operations
    async def create_password_reset_token(self, user_id: str, token_hash: str, expires_at: datetime) -> PasswordResetToken:
        reset_token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False
        )
        self.session.add(reset_token)
        await self.session.flush()
        return reset_token

    async def get_password_reset_token(self, token_hash: str) -> Optional[PasswordResetToken]:
        stmt = select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def mark_password_reset_used(self, reset_token: PasswordResetToken) -> None:
        reset_token.is_used = True
        await self.session.flush()
