from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session per request.
    Rolls back automatically on unhandled error.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
