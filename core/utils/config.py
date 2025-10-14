"""Configuration management using Pydantic Settings"""
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables - Vanta Compliant"""

    # ========================================================================
    # DATABASE CONFIGURATION
    # ========================================================================
    database_url: str = Field(
        default="postgresql://user:password@localhost:5432/travel_pricing",
        alias="DATABASE_URL"
    )
    db_echo: bool = Field(default=False, alias="DB_ECHO")
    db_pool_size: int = Field(default=20, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=10, alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=3600, alias="DB_POOL_RECYCLE")

    # ========================================================================
    # API SETTINGS
    # ========================================================================
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    api_reload: bool = Field(default=True, alias="API_RELOAD")
    api_workers: int = Field(default=4, alias="API_WORKERS")

    # ========================================================================
    # UI SETTINGS
    # ========================================================================
    ui_port: int = Field(default=8501, alias="UI_PORT")

    # ========================================================================
    # EXTERNAL APIs
    # ========================================================================
    weather_api_key: str = Field(default="", alias="WEATHER_API_KEY")
    holiday_api_key: str = Field(default="", alias="HOLIDAY_API_KEY")

    # ========================================================================
    # LOGGING & AUDIT
    # ========================================================================
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_format: str = Field(default="json", alias="LOG_FORMAT")
    enable_audit_logging: bool = Field(default=True, alias="ENABLE_AUDIT_LOGGING")
    log_retention_days: int = Field(default=90, alias="LOG_RETENTION_DAYS")
    log_pii_redaction: bool = Field(default=True, alias="LOG_PII_REDACTION")

    # ========================================================================
    # MODEL SETTINGS
    # ========================================================================
    model_artifacts_path: Path = Field(
        default=Path("data/artifacts"),
        alias="MODEL_ARTIFACTS_PATH"
    )
    enable_model_cache: bool = Field(default=True, alias="ENABLE_MODEL_CACHE")

    # ========================================================================
    # PRICING CONSTRAINTS
    # ========================================================================
    min_price_multiplier: float = Field(default=0.5, alias="MIN_PRICE_MULTIPLIER")
    max_price_multiplier: float = Field(default=3.0, alias="MAX_PRICE_MULTIPLIER")

    # ========================================================================
    # SECURITY & AUTHENTICATION
    # ========================================================================

    # JWT Configuration
    secret_key: str = Field(
        default="INSECURE_DEFAULT_KEY_CHANGE_IN_PRODUCTION",
        alias="SECRET_KEY"
    )
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=30,
        alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    refresh_token_expire_days: int = Field(
        default=7,
        alias="REFRESH_TOKEN_EXPIRE_DAYS"
    )

    # Password Policy
    min_password_length: int = Field(default=12, alias="MIN_PASSWORD_LENGTH")
    require_uppercase: bool = Field(default=True, alias="REQUIRE_UPPERCASE")
    require_lowercase: bool = Field(default=True, alias="REQUIRE_LOWERCASE")
    require_digits: bool = Field(default=True, alias="REQUIRE_DIGITS")
    require_special_chars: bool = Field(default=True, alias="REQUIRE_SPECIAL_CHARS")
    password_history_count: int = Field(default=5, alias="PASSWORD_HISTORY_COUNT")

    # Session Security
    session_cookie_secure: bool = Field(default=True, alias="SESSION_COOKIE_SECURE")
    session_cookie_httponly: bool = Field(default=True, alias="SESSION_COOKIE_HTTPONLY")
    session_cookie_samesite: str = Field(default="strict", alias="SESSION_COOKIE_SAMESITE")
    session_timeout_minutes: int = Field(default=60, alias="SESSION_TIMEOUT_MINUTES")

    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, alias="RATE_LIMIT_PER_MINUTE")
    rate_limit_per_hour: int = Field(default=1000, alias="RATE_LIMIT_PER_HOUR")
    rate_limit_enabled: bool = Field(default=True, alias="RATE_LIMIT_ENABLED")

    # CORS Configuration
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:8501,http://127.0.0.1:3000",
        alias="ALLOWED_ORIGINS"
    )
    allowed_methods: str = Field(
        default="GET,POST,PUT,DELETE",
        alias="ALLOWED_METHODS"
    )
    allowed_headers: str = Field(default="*", alias="ALLOWED_HEADERS")

    # ========================================================================
    # ENCRYPTION & DATA PROTECTION
    # ========================================================================

    encryption_key: str = Field(
        default="",
        alias="ENCRYPTION_KEY"
    )
    enable_field_encryption: bool = Field(
        default=True,
        alias="ENABLE_FIELD_ENCRYPTION"
    )

    # TLS/SSL
    enable_https: bool = Field(default=True, alias="ENABLE_HTTPS")
    ssl_cert_path: str = Field(default="", alias="SSL_CERT_PATH")
    ssl_key_path: str = Field(default="", alias="SSL_KEY_PATH")
    min_tls_version: str = Field(default="1.2", alias="MIN_TLS_VERSION")

    # Data Retention & Privacy
    data_retention_days: int = Field(default=365, alias="DATA_RETENTION_DAYS")
    enable_data_anonymization: bool = Field(
        default=True,
        alias="ENABLE_DATA_ANONYMIZATION"
    )
    gdpr_compliance: bool = Field(default=True, alias="GDPR_COMPLIANCE")
    ccpa_compliance: bool = Field(default=True, alias="CCPA_COMPLIANCE")

    # ========================================================================
    # SECURITY HEADERS
    # ========================================================================

    csp_enabled: bool = Field(default=True, alias="CSP_ENABLED")
    csp_directives: str = Field(
        default="default-src 'self'; script-src 'self' 'unsafe-inline' cdn.plot.ly; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
        alias="CSP_DIRECTIVES"
    )

    hsts_enabled: bool = Field(default=True, alias="HSTS_ENABLED")
    hsts_max_age: int = Field(default=31536000, alias="HSTS_MAX_AGE")
    x_frame_options: str = Field(default="DENY", alias="X_FRAME_OPTIONS")
    x_content_type_options: str = Field(default="nosniff", alias="X_CONTENT_TYPE_OPTIONS")
    x_xss_protection: str = Field(default="1; mode=block", alias="X_XSS_PROTECTION")
    referrer_policy: str = Field(
        default="strict-origin-when-cross-origin",
        alias="REFERRER_POLICY"
    )

    # ========================================================================
    # MONITORING & ALERTING
    # ========================================================================

    enable_failed_login_monitoring: bool = Field(
        default=True,
        alias="ENABLE_FAILED_LOGIN_MONITORING"
    )
    max_failed_login_attempts: int = Field(
        default=5,
        alias="MAX_FAILED_LOGIN_ATTEMPTS"
    )
    account_lockout_duration_minutes: int = Field(
        default=30,
        alias="ACCOUNT_LOCKOUT_DURATION_MINUTES"
    )

    # Audit Trail
    audit_log_path: str = Field(default="logs/audit.log", alias="AUDIT_LOG_PATH")
    audit_log_rotation: str = Field(default="daily", alias="AUDIT_LOG_ROTATION")
    audit_log_backup_count: int = Field(default=90, alias="AUDIT_LOG_BACKUP_COUNT")

    # Alerting
    alert_email: str = Field(default="", alias="ALERT_EMAIL")
    slack_webhook_url: str = Field(default="", alias="SLACK_WEBHOOK_URL")
    enable_security_alerts: bool = Field(default=True, alias="ENABLE_SECURITY_ALERTS")

    # ========================================================================
    # COMPLIANCE & GOVERNANCE
    # ========================================================================

    vanta_api_key: str = Field(default="", alias="VANTA_API_KEY")
    enable_vanta_sync: bool = Field(default=False, alias="ENABLE_VANTA_SYNC")

    soc2_compliance: bool = Field(default=True, alias="SOC2_COMPLIANCE")
    hipaa_compliance: bool = Field(default=False, alias="HIPAA_COMPLIANCE")
    pci_dss_compliance: bool = Field(default=False, alias="PCI_DSS_COMPLIANCE")

    # Access Control
    enable_rbac: bool = Field(default=True, alias="ENABLE_RBAC")
    enable_mfa: bool = Field(default=False, alias="ENABLE_MFA")
    enable_ip_whitelist: bool = Field(default=False, alias="ENABLE_IP_WHITELIST")
    allowed_ip_ranges: str = Field(default="", alias="ALLOWED_IP_RANGES")

    # ========================================================================
    # BACKUP & DISASTER RECOVERY
    # ========================================================================

    enable_automated_backups: bool = Field(
        default=True,
        alias="ENABLE_AUTOMATED_BACKUPS"
    )
    backup_frequency: str = Field(default="daily", alias="BACKUP_FREQUENCY")
    backup_retention_days: int = Field(default=30, alias="BACKUP_RETENTION_DAYS")
    backup_encryption: bool = Field(default=True, alias="BACKUP_ENCRYPTION")

    # Environment
    environment: str = Field(default="development", alias="ENVIRONMENT")

    # ========================================================================
    # VALIDATORS
    # ========================================================================

    @validator("secret_key")
    def validate_secret_key(cls, v, values):
        """Warn if using insecure secret key in production"""
        if values.get("environment") == "production" and v == "INSECURE_DEFAULT_KEY_CHANGE_IN_PRODUCTION":
            raise ValueError(
                "SECRET_KEY must be changed in production! "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return v

    @validator("allowed_origins")
    def parse_allowed_origins(cls, v):
        """Parse comma-separated origins"""
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    @validator("allowed_methods")
    def parse_allowed_methods(cls, v):
        """Parse comma-separated methods"""
        return [method.strip() for method in v.split(",") if method.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
