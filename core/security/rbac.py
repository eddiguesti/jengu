"""Role-Based Access Control (RBAC) - Vanta Compliant"""
from enum import Enum
from typing import Set, Dict, Optional
from dataclasses import dataclass

from ..utils.logging import get_logger

logger = get_logger(__name__)


class UserRole(str, Enum):
    """User roles for RBAC"""
    ADMIN = "admin"  # Full system access
    MANAGER = "manager"  # Manage pricing policies, view all data
    ANALYST = "analyst"  # View data, run analyses, limited edits
    VIEWER = "viewer"  # Read-only access
    API_USER = "api_user"  # Programmatic access only


class Permission(str, Enum):
    """System permissions"""
    # Pricing
    VIEW_PRICING = "view_pricing"
    EDIT_PRICING = "edit_pricing"
    APPROVE_PRICING = "approve_pricing"

    # Data
    VIEW_DATA = "view_data"
    UPLOAD_DATA = "upload_data"
    DELETE_DATA = "delete_data"
    EXPORT_DATA = "export_data"

    # Analytics
    RUN_ANALYSIS = "run_analysis"
    VIEW_INSIGHTS = "view_insights"

    # Models
    TRAIN_MODELS = "train_models"
    DEPLOY_MODELS = "deploy_models"

    # System
    MANAGE_USERS = "manage_users"
    MANAGE_SETTINGS = "manage_settings"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    MANAGE_API_KEYS = "manage_api_keys"


# Role-Permission mapping (SOC2 principle of least privilege)
ROLE_PERMISSIONS: Dict[UserRole, Set[Permission]] = {
    UserRole.ADMIN: {
        # All permissions
        Permission.VIEW_PRICING,
        Permission.EDIT_PRICING,
        Permission.APPROVE_PRICING,
        Permission.VIEW_DATA,
        Permission.UPLOAD_DATA,
        Permission.DELETE_DATA,
        Permission.EXPORT_DATA,
        Permission.RUN_ANALYSIS,
        Permission.VIEW_INSIGHTS,
        Permission.TRAIN_MODELS,
        Permission.DEPLOY_MODELS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_SETTINGS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.MANAGE_API_KEYS,
    },
    UserRole.MANAGER: {
        Permission.VIEW_PRICING,
        Permission.EDIT_PRICING,
        Permission.APPROVE_PRICING,
        Permission.VIEW_DATA,
        Permission.UPLOAD_DATA,
        Permission.EXPORT_DATA,
        Permission.RUN_ANALYSIS,
        Permission.VIEW_INSIGHTS,
        Permission.TRAIN_MODELS,
        Permission.VIEW_AUDIT_LOGS,
    },
    UserRole.ANALYST: {
        Permission.VIEW_PRICING,
        Permission.VIEW_DATA,
        Permission.UPLOAD_DATA,
        Permission.EXPORT_DATA,
        Permission.RUN_ANALYSIS,
        Permission.VIEW_INSIGHTS,
    },
    UserRole.VIEWER: {
        Permission.VIEW_PRICING,
        Permission.VIEW_DATA,
        Permission.VIEW_INSIGHTS,
    },
    UserRole.API_USER: {
        Permission.VIEW_PRICING,
        Permission.VIEW_DATA,
        Permission.RUN_ANALYSIS,
    },
}


@dataclass
class User:
    """User model for RBAC"""
    user_id: str
    email: str
    role: UserRole
    is_active: bool = True
    custom_permissions: Optional[Set[Permission]] = None


def get_user_permissions(user: User) -> Set[Permission]:
    """
    Get all permissions for a user

    Args:
        user: User object

    Returns:
        Set of permissions
    """
    if not user.is_active:
        logger.warning("permission_check_inactive_user", user_id=user.user_id)
        return set()

    # Get role-based permissions
    permissions = ROLE_PERMISSIONS.get(user.role, set()).copy()

    # Add custom permissions if any
    if user.custom_permissions:
        permissions.update(user.custom_permissions)

    return permissions


def check_permission(user: User, required_permission: Permission) -> bool:
    """
    Check if user has required permission

    Args:
        user: User object
        required_permission: Permission to check

    Returns:
        True if user has permission, False otherwise
    """
    user_permissions = get_user_permissions(user)
    has_permission = required_permission in user_permissions

    logger.info(
        "permission_check",
        user_id=user.user_id,
        permission=required_permission.value,
        granted=has_permission,
    )

    return has_permission


def require_permission(required_permission: Permission):
    """
    Decorator to require a specific permission

    Args:
        required_permission: Permission required to access the function

    Example:
        @require_permission(Permission.EDIT_PRICING)
        def update_price(user: User, price: float):
            # Function logic
    """
    def decorator(func):
        def wrapper(user: User, *args, **kwargs):
            if not check_permission(user, required_permission):
                logger.warning(
                    "permission_denied",
                    user_id=user.user_id,
                    permission=required_permission.value,
                    function=func.__name__,
                )
                raise PermissionError(
                    f"User {user.user_id} does not have {required_permission.value} permission"
                )
            return func(user, *args, **kwargs)
        return wrapper
    return decorator


def require_any_permission(*required_permissions: Permission):
    """
    Decorator to require any of the specified permissions

    Args:
        required_permissions: Permissions, any of which grants access

    Example:
        @require_any_permission(Permission.ADMIN, Permission.MANAGER)
        def sensitive_operation(user: User):
            # Function logic
    """
    def decorator(func):
        def wrapper(user: User, *args, **kwargs):
            user_permissions = get_user_permissions(user)
            has_any = any(perm in user_permissions for perm in required_permissions)

            if not has_any:
                logger.warning(
                    "permission_denied_any",
                    user_id=user.user_id,
                    required_permissions=[p.value for p in required_permissions],
                    function=func.__name__,
                )
                raise PermissionError(
                    f"User {user.user_id} does not have any of the required permissions"
                )
            return func(user, *args, **kwargs)
        return wrapper
    return decorator


def require_all_permissions(*required_permissions: Permission):
    """
    Decorator to require all specified permissions

    Args:
        required_permissions: All permissions required to access the function

    Example:
        @require_all_permissions(Permission.EDIT_PRICING, Permission.APPROVE_PRICING)
        def finalize_pricing(user: User):
            # Function logic
    """
    def decorator(func):
        def wrapper(user: User, *args, **kwargs):
            user_permissions = get_user_permissions(user)
            has_all = all(perm in user_permissions for perm in required_permissions)

            if not has_all:
                logger.warning(
                    "permission_denied_all",
                    user_id=user.user_id,
                    required_permissions=[p.value for p in required_permissions],
                    function=func.__name__,
                )
                raise PermissionError(
                    f"User {user.user_id} does not have all required permissions"
                )
            return func(user, *args, **kwargs)
        return wrapper
    return decorator
