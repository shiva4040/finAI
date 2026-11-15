from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedException
from app.repositories.user_repo import UserRepository
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db)
) -> User:
    """
    Validates the Bearer JWT token from the Authorization header,
    retrieves the authenticated user from the database,
    and returns the active User object.
    Never trusts any user_id passed in query or body parameters.
    """
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authentication token required")

    payload = decode_access_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User no longer exists")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user
