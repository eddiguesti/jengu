"""Base connector interface and registry"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Type
import pandas as pd

from ..utils.logging import get_logger

logger = get_logger(__name__)


class BaseConnector(ABC):
    """Abstract base class for all data connectors"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize connector

        Args:
            config: Connector-specific configuration
        """
        self.config = config or {}
        self._is_connected = False

    @abstractmethod
    def connect(self) -> bool:
        """
        Establish connection to data source

        Returns:
            True if successful
        """
        pass

    @abstractmethod
    def disconnect(self):
        """Close connection to data source"""
        pass

    @abstractmethod
    def fetch_data(self, **kwargs) -> pd.DataFrame:
        """
        Fetch data from source

        Returns:
            DataFrame with fetched data
        """
        pass

    @abstractmethod
    def validate(self) -> bool:
        """
        Validate connector configuration and connectivity

        Returns:
            True if valid
        """
        pass

    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()


class ConnectorRegistry:
    """Registry for managing connectors"""

    _connectors: Dict[str, Type[BaseConnector]] = {}

    @classmethod
    def register(cls, name: str, connector_class: Type[BaseConnector]):
        """
        Register a connector

        Args:
            name: Connector identifier
            connector_class: Connector class
        """
        cls._connectors[name] = connector_class
        logger.info("connector_registered", name=name)

    @classmethod
    def get(cls, name: str) -> Type[BaseConnector]:
        """
        Get connector class by name

        Args:
            name: Connector identifier

        Returns:
            Connector class
        """
        if name not in cls._connectors:
            raise ValueError(f"Connector '{name}' not found in registry")
        return cls._connectors[name]

    @classmethod
    def list_connectors(cls) -> list:
        """Get list of registered connector names"""
        return list(cls._connectors.keys())

    @classmethod
    def create(cls, name: str, config: Optional[Dict[str, Any]] = None) -> BaseConnector:
        """
        Create connector instance

        Args:
            name: Connector identifier
            config: Connector configuration

        Returns:
            Connector instance
        """
        connector_class = cls.get(name)
        return connector_class(config=config)


def register_connector(name: str):
    """
    Decorator for registering connectors

    Usage:
        @register_connector('my_connector')
        class MyConnector(BaseConnector):
            ...
    """
    def decorator(connector_class: Type[BaseConnector]):
        ConnectorRegistry.register(name, connector_class)
        return connector_class
    return decorator
