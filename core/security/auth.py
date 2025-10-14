"""Authentication and password management - Vanta Compliant"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import re

from ..utils.config import get_settings
from ..utils.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Password hashing context with bcrypt (SOC2 compliant)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password to verify against

    Returns:
        True if password matches, False otherwise
    """
    try:
        is_valid = pwd_context.verify(plain_password, hashed_password)
        if not is_valid:
            logger.warning("password_verification_failed")
        return is_valid
    except Exception as e:
        logger.error("password_verification_error", error=str(e))
        return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password against security policy

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < settings.min_password_length:
        return False, f"Password must be at least {settings.min_password_length} characters long"

    if settings.require_uppercase and not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if settings.require_lowercase and not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if settings.require_digits and not re.search(r"\d", password):
        return False, "Password must contain at least one digit"

    if settings.require_special_chars and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"

    # Check for common weak passwords
    weak_passwords = {"password", "12345678", "qwerty", "admin", "letmein"}
    if password.lower() in weak_passwords:
        return False, "Password is too common and easily guessable"

    return True, ""


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token

    Args:
        data: Data to encode in the token
        expires_delta: Custom expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })

    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
        logger.info("access_token_created", user=data.get("sub"))
        return encoded_jwt
    except Exception as e:
        logger.error("access_token_creation_failed", error=str(e))
        raise


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token

    Args:
        data: Data to encode in the token

    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })

    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
        logger.info("refresh_token_created", user=data.get("sub"))
        return encoded_jwt
    except Exception as e:
        logger.error("refresh_token_creation_failed", error=str(e))
        raise


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT token

    Args:
        token: JWT token to verify
        token_type: Expected token type ("access" or "refresh")

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        # Verify token type
        if payload.get("type") != token_type:
            logger.warning(
                "invalid_token_type",
                expected=token_type,
                actual=payload.get("type")
            )
            return None

        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
            logger.warning("token_expired", user=payload.get("sub"))
            return None

        logger.info("token_verified", user=payload.get("sub"), type=token_type)
        return payload

    except JWTError as e:
        logger.warning("token_verification_failed", error=str(e))
        return None
    except Exception as e:
        logger.error("token_verification_error", error=str(e))
        return None


def is_token_expired(token: str) -> bool:
    """
    Check if a token is expired without full verification

    Args:
        token: JWT token to check

    Returns:
        True if expired, False otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            options={"verify_exp": False}
        )
        exp = payload.get("exp")
        if exp:
            return datetime.fromtimestamp(exp) < datetime.utcnow()
        return True
    except:
        return True
