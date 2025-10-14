"""Security middleware for FastAPI - Vanta Compliant"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from typing import Callable
import time
from collections import defaultdict
from datetime import datetime, timedelta

from ..utils.config import get_settings
from ..utils.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    Implements OWASP security header best practices
    """

    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)

        # Strict-Transport-Security (HSTS)
        if settings.hsts_enabled:
            response.headers["Strict-Transport-Security"] = (
                f"max-age={settings.hsts_max_age}; includeSubDomains"
            )

        # Content Security Policy
        if settings.csp_enabled:
            response.headers["Content-Security-Policy"] = settings.csp_directives

        # X-Frame-Options (prevent clickjacking)
        response.headers["X-Frame-Options"] = settings.x_frame_options

        # X-Content-Type-Options (prevent MIME sniffing)
        response.headers["X-Content-Type-Options"] = settings.x_content_type_options

        # X-XSS-Protection
        response.headers["X-XSS-Protection"] = settings.x_xss_protection

        # Referrer-Policy
        response.headers["Referrer-Policy"] = settings.referrer_policy

        # Permissions-Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        # Remove server header (don't reveal server info)
        if "Server" in response.headers:
            del response.headers["Server"]

        # Remove X-Powered-By if present
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]

        return response


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    Log all API requests for audit trail
    Required for SOC2 compliance
    """

    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()

        # Get request details
        client_ip = get_remote_address(request)
        method = request.method
        path = request.url.path
        user_agent = request.headers.get("user-agent", "unknown")

        # Get user from token if present
        user_id = "anonymous"
        auth_header = request.headers.get("authorization")
        if auth_header:
            # Extract user from JWT if needed
            # This would integrate with your auth system
            user_id = "authenticated"  # Placeholder

        try:
            response = await call_next(request)
            status_code = response.status_code
            error = None
        except Exception as e:
            status_code = 500
            error = str(e)
            raise
        finally:
            # Calculate request duration
            duration = time.time() - start_time

            # Log audit event
            if settings.enable_audit_logging:
                logger.info(
                    "api_request",
                    user_id=user_id,
                    client_ip=client_ip,
                    method=method,
                    path=path,
                    status_code=status_code,
                    duration_ms=round(duration * 1000, 2),
                    user_agent=user_agent,
                    error=error,
                )

        return response


class FailedLoginTracker:
    """
    Track failed login attempts and implement account lockout
    Required for security compliance
    """

    def __init__(self):
        self.failed_attempts = defaultdict(list)
        self.locked_accounts = {}

    def record_failed_attempt(self, identifier: str) -> bool:
        """
        Record a failed login attempt

        Args:
            identifier: Username, email, or IP address

        Returns:
            True if account should be locked, False otherwise
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=settings.account_lockout_duration_minutes)

        # Clean old attempts
        self.failed_attempts[identifier] = [
            attempt_time
            for attempt_time in self.failed_attempts[identifier]
            if attempt_time > cutoff
        ]

        # Add new attempt
        self.failed_attempts[identifier].append(now)

        # Check if should lock
        if len(self.failed_attempts[identifier]) >= settings.max_failed_login_attempts:
            self.locked_accounts[identifier] = now + timedelta(
                minutes=settings.account_lockout_duration_minutes
            )
            logger.warning(
                "account_locked",
                identifier=identifier,
                attempts=len(self.failed_attempts[identifier]),
            )
            return True

        return False

    def is_locked(self, identifier: str) -> bool:
        """
        Check if an account is locked

        Args:
            identifier: Username, email, or IP address

        Returns:
            True if locked, False otherwise
        """
        if identifier in self.locked_accounts:
            if datetime.utcnow() < self.locked_accounts[identifier]:
                return True
            else:
                # Lock expired, remove it
                del self.locked_accounts[identifier]
                del self.failed_attempts[identifier]
        return False

    def clear_attempts(self, identifier: str):
        """Clear failed attempts after successful login"""
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]
        if identifier in self.locked_accounts:
            del self.locked_accounts[identifier]


# Global instance
failed_login_tracker = FailedLoginTracker()


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """
    Restrict access to whitelisted IP ranges
    Optional security layer
    """

    async def dispatch(self, request: Request, call_next: Callable):
        if not settings.enable_ip_whitelist:
            return await call_next(request)

        client_ip = get_remote_address(request)

        # Parse allowed IP ranges
        allowed_ranges = [
            ip.strip()
            for ip in settings.allowed_ip_ranges.split(",")
            if ip.strip()
        ]

        if allowed_ranges and client_ip not in allowed_ranges:
            logger.warning("ip_not_whitelisted", client_ip=client_ip)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: IP not whitelisted",
            )

        return await call_next(request)


def sanitize_input(value: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent injection attacks

    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not value:
        return ""

    # Truncate to max length
    value = value[:max_length]

    # Remove null bytes
    value = value.replace("\x00", "")

    # Remove other control characters (optional)
    value = "".join(char for char in value if char.isprintable() or char in "\n\r\t")

    return value.strip()


def validate_file_upload(filename: str, allowed_extensions: set) -> bool:
    """
    Validate uploaded file

    Args:
        filename: Name of uploaded file
        allowed_extensions: Set of allowed file extensions

    Returns:
        True if valid, False otherwise
    """
    if not filename:
        return False

    # Check extension
    ext = filename.lower().split(".")[-1]
    if ext not in allowed_extensions:
        logger.warning("invalid_file_extension", filename=filename, extension=ext)
        return False

    # Check for path traversal attempts
    if ".." in filename or "/" in filename or "\\" in filename:
        logger.warning("path_traversal_attempt", filename=filename)
        return False

    return True
