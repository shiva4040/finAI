from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from collections import defaultdict
import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
    NotFoundException,
)
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    generate_secure_token,
    hash_token,
)
from app.repositories.user_repo import UserRepository
from app.models.user import User


# In-memory sliding window rate limiter for login attempts
_login_attempts: Dict[str, list] = defaultdict(list)


def check_rate_limit(ip_or_email: str) -> None:
    now = time.time()
    window = 60.0  # 1 minute
    attempts = [t for t in _login_attempts[ip_or_email] if now - t < window]
    _login_attempts[ip_or_email] = attempts
    if len(attempts) >= settings.LOGIN_RATE_LIMIT_PER_MINUTE:
        raise BadRequestException("Too many login attempts. Please wait 1 minute before trying again.")
    _login_attempts[ip_or_email].append(now)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def register(self, name: str, email: str, password: str) -> Dict[str, Any]:
        validate_password_strength(password)
        normalized_email = email.strip().lower()

        existing = await self.user_repo.get_by_email(normalized_email)
        if existing:
            raise ConflictException("An account with this email address already exists")

        pwd_hash = hash_password(password)
        user = await self.user_repo.create(name=name, email=normalized_email, password_hash=pwd_hash)
        await self.session.commit()
        await self.session.refresh(user)

        tokens = await self._issue_tokens(user)
        return {
            "user": user,
            "tokens": tokens
        }

    async def login(self, email: str, password: str, client_id: str = "default") -> Dict[str, Any]:
        check_rate_limit(client_id)
        normalized_email = email.strip().lower()
        user = await self.user_repo.get_by_email(normalized_email)

        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("Account is currently deactivated")

        tokens = await self._issue_tokens(user)
        await self.session.commit()
        return {
            "user": user,
            "tokens": tokens
        }

    async def refresh_token(self, raw_refresh_token: str) -> Dict[str, Any]:
        if not raw_refresh_token:
            raise UnauthorizedException("Refresh token is required")

        t_hash = hash_token(raw_refresh_token)
        token_record = await self.user_repo.get_refresh_token(t_hash)

        if not token_record:
            raise UnauthorizedException("Invalid refresh token")

        if token_record.is_revoked:
            # Possible token reuse attack detected! Revoke all tokens for safety
            await self.user_repo.revoke_all_user_tokens(token_record.user_id)
            await self.session.commit()
            raise UnauthorizedException("Revoked refresh token presented. All sessions terminated.")

        now = datetime.now(timezone.utc)
        # Ensure timezone-aware comparison
        exp = token_record.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if exp < now:
            token_record.is_revoked = True
            await self.session.commit()
            raise UnauthorizedException("Refresh token has expired")

        user = await self.user_repo.get_by_id(token_record.user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User account not found or inactive")

        # ROTATION: Revoke old token and issue new refresh token
        new_raw_refresh = generate_secure_token()
        new_t_hash = hash_token(new_raw_refresh)
        new_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.user_repo.revoke_refresh_token(token_record, replaced_by=new_t_hash)
        await self.user_repo.create_refresh_token(user.id, new_t_hash, new_expires_at)

        new_access_token = create_access_token({"sub": user.id, "email": user.email})
        await self.session.commit()

        return {
            "access_token": new_access_token,
            "refresh_token": new_raw_refresh,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

    async def logout(self, raw_refresh_token: Optional[str]) -> None:
        if raw_refresh_token:
            t_hash = hash_token(raw_refresh_token)
            token_record = await self.user_repo.get_refresh_token(t_hash)
            if token_record and not token_record.is_revoked:
                await self.user_repo.revoke_refresh_token(token_record)
                await self.session.commit()

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise BadRequestException("Current password is incorrect")

        validate_password_strength(new_password)
        new_hash = hash_password(new_password)
        user.password_hash = new_hash
        # Revoke existing sessions on password change
        await self.user_repo.revoke_all_user_tokens(user.id)
        await self.session.commit()

    async def forgot_password(self, email: str) -> Optional[str]:
        """
        Generates a reset token if user exists.
        Always returns generic response to prevent user enumeration.
        """
        normalized = email.strip().lower()
        user = await self.user_repo.get_by_email(normalized)
        if not user:
            return None

        raw_token = generate_secure_token()
        t_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        await self.user_repo.create_password_reset_token(user.id, t_hash, expires_at)
        await self.session.commit()
        return raw_token

    async def reset_password(self, raw_token: str, new_password: str) -> None:
        if not raw_token:
            raise BadRequestException("Reset token is required")

        validate_password_strength(new_password)
        t_hash = hash_token(raw_token)
        reset_record = await self.user_repo.get_password_reset_token(t_hash)

        if not reset_record or reset_record.is_used:
            raise BadRequestException("Invalid or already used password reset token")

        now = datetime.now(timezone.utc)
        exp = reset_record.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if exp < now:
            raise BadRequestException("Password reset token has expired")

        user = await self.user_repo.get_by_id(reset_record.user_id)
        if not user:
            raise NotFoundException("User not found")

        user.password_hash = hash_password(new_password)
        await self.user_repo.mark_password_reset_used(reset_record)
        await self.user_repo.revoke_all_user_tokens(user.id)
        await self.session.commit()

    async def _issue_tokens(self, user: User) -> Dict[str, Any]:
        access_token = create_access_token({"sub": user.id, "email": user.email})
        raw_refresh = generate_secure_token()
        t_hash = hash_token(raw_refresh)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.user_repo.create_refresh_token(user.id, t_hash, expires_at)
        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
