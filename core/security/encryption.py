"""Data encryption and hashing utilities - Vanta Compliant"""
from typing import Optional
from cryptography.fernet import Fernet
import hashlib
import base64

from ..utils.config import get_settings
from ..utils.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


def get_encryption_key() -> bytes:
    """
    Get or generate encryption key

    Returns:
        Encryption key as bytes
    """
    if settings.encryption_key:
        # Ensure key is properly formatted
        key = settings.encryption_key.encode() if isinstance(settings.encryption_key, str) else settings.encryption_key
        return key
    else:
        # Generate a new key (should be stored in environment)
        logger.warning("encryption_key_not_set_generating_temporary")
        return Fernet.generate_key()


def encrypt_field(data: str) -> str:
    """
    Encrypt sensitive field data using Fernet (symmetric encryption)

    Args:
        data: Plain text data to encrypt

    Returns:
        Base64 encoded encrypted data

    Example:
        >>> encrypted = encrypt_field("sensitive@email.com")
        >>> # Store encrypted in database
    """
    if not settings.enable_field_encryption:
        logger.warning("field_encryption_disabled_returning_plaintext")
        return data

    try:
        f = Fernet(get_encryption_key())
        encrypted_bytes = f.encrypt(data.encode())
        encrypted_str = base64.b64encode(encrypted_bytes).decode()
        logger.debug("field_encrypted")
        return encrypted_str
    except Exception as e:
        logger.error("field_encryption_failed", error=str(e))
        raise


def decrypt_field(encrypted_data: str) -> str:
    """
    Decrypt encrypted field data

    Args:
        encrypted_data: Base64 encoded encrypted data

    Returns:
        Decrypted plain text data

    Example:
        >>> decrypted = decrypt_field(encrypted_data)
        >>> # Use decrypted data
    """
    if not settings.enable_field_encryption:
        logger.warning("field_encryption_disabled_returning_data_as_is")
        return encrypted_data

    try:
        f = Fernet(get_encryption_key())
        encrypted_bytes = base64.b64decode(encrypted_data.encode())
        decrypted_bytes = f.decrypt(encrypted_bytes)
        decrypted_str = decrypted_bytes.decode()
        logger.debug("field_decrypted")
        return decrypted_str
    except Exception as e:
        logger.error("field_decryption_failed", error=str(e))
        raise


def hash_sensitive_data(data: str, salt: Optional[str] = None) -> str:
    """
    One-way hash of sensitive data (e.g., for storing API keys, tokens)
    Uses SHA-256 for compliance

    Args:
        data: Data to hash
        salt: Optional salt for additional security

    Returns:
        Hexadecimal hash string

    Example:
        >>> hashed = hash_sensitive_data("api_key_12345")
        >>> # Store hashed value for comparison
    """
    try:
        if salt:
            data_to_hash = f"{data}{salt}"
        else:
            data_to_hash = data

        hash_object = hashlib.sha256(data_to_hash.encode())
        hashed_str = hash_object.hexdigest()
        logger.debug("sensitive_data_hashed")
        return hashed_str
    except Exception as e:
        logger.error("hashing_failed", error=str(e))
        raise


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key

    Returns:
        Base64 encoded encryption key

    Example:
        >>> key = generate_encryption_key()
        >>> # Store in environment variable ENCRYPTION_KEY
    """
    key = Fernet.generate_key()
    return key.decode()


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data for logging/display (e.g., credit cards, API keys)

    Args:
        data: Data to mask
        visible_chars: Number of characters to keep visible at end

    Returns:
        Masked string

    Example:
        >>> masked = mask_sensitive_data("1234567890123456", 4)
        >>> # Output: "************3456"
    """
    if len(data) <= visible_chars:
        return "*" * len(data)

    masked_length = len(data) - visible_chars
    return "*" * masked_length + data[-visible_chars:]


def redact_pii_from_text(text: str) -> str:
    """
    Redact potential PII from text for logging

    Args:
        text: Text potentially containing PII

    Returns:
        Text with PII redacted

    Example:
        >>> safe_text = redact_pii_from_text("Email: user@example.com, SSN: 123-45-6789")
        >>> # Output: "Email: [REDACTED_EMAIL], SSN: [REDACTED_SSN]"
    """
    import re

    if not settings.log_pii_redaction:
        return text

    # Email addresses
    text = re.sub(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        '[REDACTED_EMAIL]',
        text
    )

    # SSN patterns (XXX-XX-XXXX)
    text = re.sub(
        r'\b\d{3}-\d{2}-\d{4}\b',
        '[REDACTED_SSN]',
        text
    )

    # Credit card patterns (simplified)
    text = re.sub(
        r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
        '[REDACTED_CC]',
        text
    )

    # Phone numbers
    text = re.sub(
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        '[REDACTED_PHONE]',
        text
    )

    # IP addresses (optional, depends on requirements)
    text = re.sub(
        r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
        '[REDACTED_IP]',
        text
    )

    return text
