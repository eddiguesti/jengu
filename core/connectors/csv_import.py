"""CSV file import connector"""
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any, List

from .base import BaseConnector, register_connector
from ..utils.logging import get_logger

logger = get_logger(__name__)


@register_connector('csv')
class CSVConnector(BaseConnector):
    """Connector for importing CSV files"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.file_path: Optional[Path] = None
        self.column_mapping: Optional[Dict[str, str]] = None

    def connect(self) -> bool:
        """Validate file path exists"""
        file_path = self.config.get('file_path')
        if not file_path:
            logger.error("csv_connect_failed", reason="file_path not provided")
            return False

        self.file_path = Path(file_path)
        if not self.file_path.exists():
            logger.error("csv_connect_failed", reason="file does not exist", path=str(self.file_path))
            return False

        self.column_mapping = self.config.get('column_mapping', {})
        self._is_connected = True
        logger.info("csv_connected", path=str(self.file_path))
        return True

    def disconnect(self):
        """No cleanup needed for CSV"""
        self._is_connected = False

    def fetch_data(
        self,
        date_columns: Optional[List[str]] = None,
        **pandas_kwargs
    ) -> pd.DataFrame:
        """
        Read CSV file into DataFrame

        Args:
            date_columns: Columns to parse as dates
            **pandas_kwargs: Additional arguments for pd.read_csv

        Returns:
            DataFrame with CSV data
        """
        if not self._is_connected:
            raise RuntimeError("Not connected. Call connect() first.")

        logger.info("reading_csv", path=str(self.file_path))

        # Read CSV
        df = pd.read_csv(self.file_path, parse_dates=date_columns, **pandas_kwargs)

        # Apply column mapping if provided
        if self.column_mapping:
            df = df.rename(columns=self.column_mapping)
            logger.info("columns_mapped", mapping=self.column_mapping)

        logger.info("csv_data_fetched", rows=len(df), columns=len(df.columns))
        return df

    def validate(self) -> bool:
        """Validate CSV can be read"""
        try:
            if not self.connect():
                return False

            # Try reading header
            pd.read_csv(self.file_path, nrows=1)
            logger.info("csv_validation_passed")
            return True

        except Exception as e:
            logger.error("csv_validation_failed", error=str(e))
            return False


def import_csv_bookings(file_path: str, column_mapping: Optional[Dict[str, str]] = None) -> pd.DataFrame:
    """
    Convenience function to import booking data from CSV

    Args:
        file_path: Path to CSV file
        column_mapping: Optional column name mapping

    Returns:
        DataFrame with booking data
    """
    connector = CSVConnector(config={
        'file_path': file_path,
        'column_mapping': column_mapping
    })

    with connector:
        df = connector.fetch_data(date_columns=['booking_date', 'checkin_date', 'checkout_date'])

    return df
