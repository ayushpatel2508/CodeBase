import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

logger = logging.getLogger(__name__)

# Token expirations
ACCESS_TOKEN_EXPIRATION_MINUTES = 15
REFRESH_TOKEN_EXPIRATION_DAYS = 7


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    bcrypt automatically generates a random salt and embeds it into the hash,
    so we don't need to manage salts separately.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """
    Compare a plaintext password against the stored bcrypt hash.
    Returns True if they match, False otherwise.
    """
    password_bytes = password.encode("utf-8")
    hashed_bytes = hashed.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(user_id: str, username: str) -> str:
    """
    Create a signed JWT access token containing the user's ID and username.
    Expires in 15 minutes.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "username": username,
        "type": "access",
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRATION_MINUTES),
        "iat": now,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")

def create_refresh_token(user_id: str) -> str:
    """
    Create a signed JWT refresh token.
    Expires in 7 days.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": now + timedelta(days=REFRESH_TOKEN_EXPIRATION_DAYS),
        "iat": now,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")

def decode_jwt_token(token: str) -> dict | None:
    """
    Decode and verify a JWT token.
    Returns the payload dict if valid, or None if expired/invalid.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None
