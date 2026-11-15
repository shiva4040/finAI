import hashlib
import secrets
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash
import jwt

from app.core.config import settings
from app.core.exceptions import UnauthorizedException, BadRequestException

# Initialize Argon2 Password Hasher
ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=2,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    """Hashes a password with Argon2."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored Argon2 hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHash):
        return False


def validate_password_strength(password: str) -> None:
    """
    Validates password strength:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number or special character
    """
    if len(password) < 8:
        raise BadRequestException("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise BadRequestException("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise BadRequestException("Password must contain at least one lowercase letter")
    if not re.search(r"[\d\W_]", password):
        raise BadRequestException("Password must contain at least one digit or special character")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "type": "access"
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException("Access token has expired")
    except (jwt.InvalidTokenError, Exception):
        raise UnauthorizedException("Could not validate access token")


def generate_secure_token() -> str:
    """Generates an unguessable URL-safe random string for refresh or reset tokens."""
    return secrets.token_urlsafe(48)


def hash_token(raw_token: str) -> str:
    """Computes SHA-256 hash of a raw token to store safely in the database."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
