"""
Data Validator
Validate uploaded data, detect issues, suggest fixes
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime


class DataValidator:
    """Validate uploaded booking data"""

    def __init__(self, df: pd.DataFrame, column_mapping: Optional[Dict[str, str]] = None):
        """
        Args:
            df: Raw uploaded DataFrame
            column_mapping: {"date": "booking_date", "price": "room_price", ...}
        """
        self.df = df
        self.column_mapping = column_mapping or {}
        self.issues: List[Dict] = []
        self.warnings: List[Dict] = []

    def validate_all(self) -> Tuple[List[Dict], List[Dict]]:
        """
        Run all validation checks

        Returns:
            (issues, warnings)
        """
        self.issues = []
        self.warnings = []

        self._check_required_columns()
        self._check_missing_values()
        self._check_date_format()
        self._check_negative_values()
        self._check_outliers()
        self._check_duplicates()

        return self.issues, self.warnings

    def _check_required_columns(self):
        """Check if required columns are present"""
        required = ["date", "price"]

        for col in required:
            mapped_col = self.column_mapping.get(col, col)
            if mapped_col not in self.df.columns:
                self.issues.append({
                    "type": "missing_column",
                    "severity": "error",
                    "column": col,
                    "message": f"Required column '{col}' not found (mapped to '{mapped_col}')"
                })

    def _check_missing_values(self):
        """Check for missing values"""
        for col in self.df.columns:
            missing_count = self.df[col].isna().sum()
            missing_pct = (missing_count / len(self.df)) * 100

            if missing_pct > 50:
                self.issues.append({
                    "type": "missing_values",
                    "severity": "error",
                    "column": col,
                    "count": missing_count,
                    "percentage": round(missing_pct, 2),
                    "message": f"Column '{col}' has {missing_pct:.1f}% missing values"
                })
            elif missing_pct > 10:
                self.warnings.append({
                    "type": "missing_values",
                    "severity": "warning",
                    "column": col,
                    "count": missing_count,
                    "percentage": round(missing_pct, 2),
                    "message": f"Column '{col}' has {missing_pct:.1f}% missing values"
                })

    def _check_date_format(self):
        """Check if date column is parseable"""
        date_col = self.column_mapping.get("date", "date")

        if date_col not in self.df.columns:
            return

        try:
            pd.to_datetime(self.df[date_col], errors='coerce')
        except Exception as e:
            self.issues.append({
                "type": "date_format",
                "severity": "error",
                "column": date_col,
                "message": f"Cannot parse date column: {str(e)}"
            })

    def _check_negative_values(self):
        """Check for negative prices/bookings"""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            negative_count = (self.df[col] < 0).sum()

            if negative_count > 0:
                self.warnings.append({
                    "type": "negative_values",
                    "severity": "warning",
                    "column": col,
                    "count": negative_count,
                    "message": f"Column '{col}' has {negative_count} negative values"
                })

    def _check_outliers(self) -> Dict[str, pd.DataFrame]:
        """
        Detect outliers using IQR method

        Returns:
            Dict of {column: outlier_df}
        """
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        outliers = {}

        for col in numeric_cols:
            Q1 = self.df[col].quantile(0.25)
            Q3 = self.df[col].quantile(0.75)
            IQR = Q3 - Q1

            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR

            outlier_mask = (self.df[col] < lower_bound) | (self.df[col] > upper_bound)
            outlier_count = outlier_mask.sum()

            if outlier_count > 0:
                outlier_pct = (outlier_count / len(self.df)) * 100
                outliers[col] = self.df[outlier_mask]

                self.warnings.append({
                    "type": "outliers",
                    "severity": "warning",
                    "column": col,
                    "count": outlier_count,
                    "percentage": round(outlier_pct, 2),
                    "lower_bound": round(lower_bound, 2),
                    "upper_bound": round(upper_bound, 2),
                    "message": f"Column '{col}' has {outlier_count} outliers ({outlier_pct:.1f}%)"
                })

        return outliers

    def _check_duplicates(self):
        """Check for duplicate rows"""
        date_col = self.column_mapping.get("date", "date")

        if date_col not in self.df.columns:
            return

        duplicate_count = self.df.duplicated(subset=[date_col]).sum()

        if duplicate_count > 0:
            self.warnings.append({
                "type": "duplicates",
                "severity": "warning",
                "column": date_col,
                "count": duplicate_count,
                "message": f"{duplicate_count} duplicate dates found"
            })

    def get_summary(self) -> Dict:
        """Get validation summary"""
        return {
            "total_rows": len(self.df),
            "total_columns": len(self.df.columns),
            "issues_count": len(self.issues),
            "warnings_count": len(self.warnings),
            "is_valid": len(self.issues) == 0
        }

    def auto_fix(self) -> pd.DataFrame:
        """
        Attempt automatic fixes

        Returns:
            Cleaned DataFrame
        """
        df_clean = self.df.copy()

        # Fix date column
        date_col = self.column_mapping.get("date", "date")
        if date_col in df_clean.columns:
            df_clean[date_col] = pd.to_datetime(df_clean[date_col], errors='coerce')

        # Remove duplicates
        if date_col in df_clean.columns:
            df_clean = df_clean.drop_duplicates(subset=[date_col], keep='first')

        # Handle missing values (forward fill for time series)
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df_clean[col].isna().sum() > 0:
                df_clean[col] = df_clean[col].fillna(method='ffill').fillna(method='bfill')

        return df_clean


def suggest_column_mapping(df: pd.DataFrame) -> Dict[str, str]:
    """
    Auto-suggest column mapping based on column names

    Args:
        df: Raw DataFrame

    Returns:
        Suggested mapping: {"date": "booking_date", "price": "room_price", ...}
    """
    mapping = {}

    # Date column
    date_keywords = ["date", "day", "time", "datetime", "timestamp"]
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in date_keywords):
            mapping["date"] = col
            break

    # Price column
    price_keywords = ["price", "rate", "cost", "tarif", "amount"]
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in price_keywords):
            mapping["price"] = col
            break

    # Bookings column
    booking_keywords = ["booking", "occupancy", "rooms", "units", "sold"]
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in booking_keywords):
            mapping["bookings"] = col
            break

    # Revenue column
    revenue_keywords = ["revenue", "income", "sales", "turnover"]
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in revenue_keywords):
            mapping["revenue"] = col
            break

    # Channel column
    channel_keywords = ["channel", "source", "platform", "booking_source"]
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in channel_keywords):
            mapping["channel"] = col
            break

    return mapping
