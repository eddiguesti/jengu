"""
Sentry Configuration for Pricing Service
=========================================
Configures Sentry for error tracking and performance monitoring.

Features:
- Error tracking with context
- Performance monitoring (transactions, spans)
- Request ID tagging
- User context
- Custom tags and metadata
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def init_sentry(
    dsn: Optional[str] = None,
    environment: Optional[str] = None,
    release: Optional[str] = None,
    traces_sample_rate: float = 0.1,
    profiles_sample_rate: float = 0.1
):
    """
    Initialize Sentry SDK

    Args:
        dsn: Sentry DSN (from env var SENTRY_DSN if not provided)
        environment: Environment name (dev, staging, prod)
        release: Release version
        traces_sample_rate: Fraction of transactions to trace (0.0-1.0)
        profiles_sample_rate: Fraction of transactions to profile (0.0-1.0)
    """
    dsn = dsn or os.getenv('SENTRY_DSN')

    if not dsn:
        logger.warning("Sentry DSN not configured, skipping initialization")
        return

    environment = environment or os.getenv('ENVIRONMENT', 'development')
    release = release or os.getenv('RELEASE', 'unknown')

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,

        # Performance monitoring
        traces_sample_rate=traces_sample_rate,
        profiles_sample_rate=profiles_sample_rate,

        # Integrations
        integrations=[
            FastApiIntegration(
                transaction_style="url",  # Group by URL path
                failed_request_status_codes=[500, 501, 502, 503, 504]
            ),
            LoggingIntegration(
                level=logging.INFO,        # Capture info and above
                event_level=logging.ERROR  # Send errors as events
            ),
        ],

        # Additional options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send PII (user emails, IPs, etc.)
        max_breadcrumbs=50,

        # Before send hook for filtering
        before_send=before_send_hook,

        # Before send transaction hook for filtering
        before_send_transaction=before_send_transaction_hook,
    )

    logger.info(f"Sentry initialized: environment={environment}, release={release}")


def before_send_hook(event, hint):
    """
    Filter/modify events before sending to Sentry

    Args:
        event: Sentry event dict
        hint: Additional context

    Returns:
        Modified event or None to drop
    """
    # Filter out specific exceptions
    if 'exc_info' in hint:
        exc_type, exc_value, tb = hint['exc_info']

        # Don't send specific errors
        if isinstance(exc_value, (KeyboardInterrupt, SystemExit)):
            return None

        # Don't send 404s
        if hasattr(exc_value, 'status_code') and exc_value.status_code == 404:
            return None

    # Add custom tags
    event.setdefault('tags', {})
    event['tags']['service'] = 'pricing-service'

    return event


def before_send_transaction_hook(event, hint):
    """
    Filter/modify transactions before sending to Sentry

    Args:
        event: Sentry transaction dict
        hint: Additional context

    Returns:
        Modified event or None to drop
    """
    # Don't send health check transactions
    if event.get('transaction') in ['/health', '/']:
        return None

    # Sample down low-value transactions
    if event.get('transaction') == '/metrics':
        # Only send 1% of /metrics transactions
        import random
        if random.random() > 0.01:
            return None

    return event


def set_request_context(
    request_id: str,
    user_id: Optional[str] = None,
    property_id: Optional[str] = None,
    additional_tags: Optional[dict] = None
):
    """
    Set context for current request/transaction

    Args:
        request_id: Unique request ID
        user_id: User ID (if available)
        property_id: Property ID (if available)
        additional_tags: Additional tags to attach
    """
    with sentry_sdk.configure_scope() as scope:
        # Set request ID
        scope.set_tag('request_id', request_id)

        # Set user context
        if user_id:
            scope.set_user({'id': user_id})

        # Set property context
        if property_id:
            scope.set_tag('property_id', property_id)

        # Set additional tags
        if additional_tags:
            for key, value in additional_tags.items():
                scope.set_tag(key, value)


def capture_exception_with_context(
    exception: Exception,
    context: Optional[dict] = None,
    level: str = 'error'
):
    """
    Capture exception with additional context

    Args:
        exception: Exception to capture
        context: Additional context dict
        level: Severity level (fatal, error, warning, info, debug)
    """
    with sentry_sdk.push_scope() as scope:
        scope.level = level

        # Add context as extra data
        if context:
            for key, value in context.items():
                scope.set_context(key, value)

        sentry_sdk.capture_exception(exception)


def capture_message_with_context(
    message: str,
    context: Optional[dict] = None,
    level: str = 'info'
):
    """
    Capture message with additional context

    Args:
        message: Message to capture
        context: Additional context dict
        level: Severity level
    """
    with sentry_sdk.push_scope() as scope:
        scope.level = level

        if context:
            for key, value in context.items():
                scope.set_context(key, value)

        sentry_sdk.capture_message(message)


def start_transaction(name: str, op: str = 'http.server'):
    """
    Start a new Sentry transaction

    Args:
        name: Transaction name (e.g., 'POST /score')
        op: Operation type (e.g., 'http.server', 'task', 'function')

    Returns:
        Transaction object
    """
    return sentry_sdk.start_transaction(name=name, op=op)


def start_span(description: str, op: str = 'function'):
    """
    Start a new span within current transaction

    Args:
        description: Span description (e.g., 'Model prediction')
        op: Operation type (e.g., 'function', 'db.query', 'http.client')

    Returns:
        Span object
    """
    return sentry_sdk.start_span(description=description, op=op)
