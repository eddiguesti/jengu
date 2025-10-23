"""
Outcomes Storage for Learning Loop
===================================
Stores booking outcomes for model retraining and performance tracking.

Features:
- Per-property outcome datasets
- Validation and deduplication
- Query API for retraining
- Data quality metrics
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import pandas as pd
from pathlib import Path

logger = logging.getLogger(__name__)


class OutcomesStorage:
    """
    Manages storage of booking outcomes for model learning
    """

    def __init__(self, storage_dir: str = 'data/outcomes'):
        """
        Initialize outcomes storage

        Args:
            storage_dir: Directory for storing outcome datasets
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Outcomes storage initialized: {self.storage_dir}")

    def validate_outcome(self, outcome: Dict) -> bool:
        """
        Validate outcome data

        Args:
            outcome: Outcome dictionary

        Returns:
            True if valid, False otherwise
        """
        required_fields = [
            'property_id',
            'timestamp',
            'quoted_price',
            'accepted',
        ]

        for field in required_fields:
            if field not in outcome:
                logger.warning(f"Missing required field: {field}")
                return False

        # Validate types
        if not isinstance(outcome['quoted_price'], (int, float)) or outcome['quoted_price'] <= 0:
            logger.warning(f"Invalid quoted_price: {outcome['quoted_price']}")
            return False

        if not isinstance(outcome['accepted'], bool):
            logger.warning(f"Invalid accepted flag: {outcome['accepted']}")
            return False

        return True

    def store_outcomes(
        self,
        property_id: str,
        outcomes: List[Dict],
        deduplicate: bool = True
    ) -> Dict:
        """
        Store booking outcomes for a property

        Args:
            property_id: Property UUID
            outcomes: List of outcome dictionaries
            deduplicate: Whether to remove duplicates

        Returns:
            Dict with storage statistics
        """
        logger.info(f"Storing {len(outcomes)} outcomes for property {property_id}")

        # Validate outcomes
        valid_outcomes = [o for o in outcomes if self.validate_outcome(o)]
        invalid_count = len(outcomes) - len(valid_outcomes)

        if invalid_count > 0:
            logger.warning(f"Filtered out {invalid_count} invalid outcomes")

        if not valid_outcomes:
            return {
                'success': False,
                'stored': 0,
                'invalid': invalid_count,
                'error': 'No valid outcomes to store'
            }

        # Convert to DataFrame
        new_df = pd.DataFrame(valid_outcomes)

        # Add property_id if not present
        if 'property_id' not in new_df.columns:
            new_df['property_id'] = property_id

        # Ensure timestamp is datetime
        new_df['timestamp'] = pd.to_datetime(new_df['timestamp'])

        # Load existing data if present
        filepath = self.storage_dir / f"{property_id}_outcomes.parquet"

        if filepath.exists():
            existing_df = pd.read_parquet(filepath)

            # Concatenate
            combined_df = pd.concat([existing_df, new_df], ignore_index=True)

            # Deduplicate if requested
            if deduplicate:
                before_count = len(combined_df)
                # Deduplicate by timestamp and quoted_price
                combined_df = combined_df.drop_duplicates(
                    subset=['timestamp', 'quoted_price'],
                    keep='last'
                )
                duplicate_count = before_count - len(combined_df)
                logger.info(f"Removed {duplicate_count} duplicates")
            else:
                duplicate_count = 0

            # Sort by timestamp
            combined_df = combined_df.sort_values('timestamp')

        else:
            combined_df = new_df
            duplicate_count = 0

        # Save to parquet (efficient columnar format)
        combined_df.to_parquet(filepath, index=False)

        logger.info(f"Stored outcomes to {filepath}: {len(combined_df)} total records")

        return {
            'success': True,
            'stored': len(valid_outcomes) - duplicate_count,
            'invalid': invalid_count,
            'duplicates': duplicate_count,
            'total_records': len(combined_df),
            'filepath': str(filepath)
        }

    def get_outcomes(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Retrieve outcomes for a property

        Args:
            property_id: Property UUID
            start_date: Optional start date filter
            end_date: Optional end date filter
            limit: Optional limit on number of records

        Returns:
            DataFrame of outcomes
        """
        filepath = self.storage_dir / f"{property_id}_outcomes.parquet"

        if not filepath.exists():
            logger.warning(f"No outcomes found for property {property_id}")
            return pd.DataFrame()

        df = pd.read_parquet(filepath)

        # Apply date filters
        if start_date:
            df = df[df['timestamp'] >= pd.to_datetime(start_date)]

        if end_date:
            df = df[df['timestamp'] <= pd.to_datetime(end_date)]

        # Apply limit
        if limit:
            df = df.tail(limit)

        logger.info(f"Retrieved {len(df)} outcomes for property {property_id}")

        return df

    def get_statistics(self, property_id: str) -> Dict:
        """
        Get statistics about stored outcomes

        Args:
            property_id: Property UUID

        Returns:
            Dictionary of statistics
        """
        filepath = self.storage_dir / f"{property_id}_outcomes.parquet"

        if not filepath.exists():
            return {
                'exists': False,
                'total_records': 0
            }

        df = pd.read_parquet(filepath)

        # Calculate statistics
        stats = {
            'exists': True,
            'total_records': len(df),
            'date_range': {
                'min': df['timestamp'].min().isoformat() if len(df) > 0 else None,
                'max': df['timestamp'].max().isoformat() if len(df) > 0 else None
            },
            'acceptance_rate': df['accepted'].mean() if 'accepted' in df.columns else None,
            'avg_quoted_price': df['quoted_price'].mean() if 'quoted_price' in df.columns else None,
            'avg_final_price': df['final_price'].mean() if 'final_price' in df.columns and df['accepted'].sum() > 0 else None,
            'file_size_mb': filepath.stat().st_size / 1024 / 1024,
        }

        # Data quality metrics
        stats['data_quality'] = {
            'missing_final_price': df['final_price'].isna().sum() if 'final_price' in df.columns else 0,
            'missing_comp_bands': df['comp_p50'].isna().sum() if 'comp_p50' in df.columns else 0,
            'missing_context': df['context'].isna().sum() if 'context' in df.columns else 0,
        }

        # Recent activity (last 7 days)
        recent_cutoff = datetime.now() - pd.Timedelta(days=7)
        recent_df = df[df['timestamp'] >= recent_cutoff]
        stats['recent_activity'] = {
            'last_7_days': len(recent_df),
            'acceptance_rate_7d': recent_df['accepted'].mean() if len(recent_df) > 0 else None
        }

        return stats

    def export_for_training(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        output_path: Optional[str] = None
    ) -> str:
        """
        Export outcomes in format ready for model training

        Args:
            property_id: Property UUID
            start_date: Optional start date filter
            end_date: Optional end date filter
            output_path: Optional output path (defaults to data/training/)

        Returns:
            Path to exported file
        """
        df = self.get_outcomes(property_id, start_date, end_date)

        if df.empty:
            raise ValueError(f"No outcomes found for property {property_id}")

        # Default output path
        if output_path is None:
            training_dir = Path('data/training')
            training_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = training_dir / f"{property_id}_outcomes_{timestamp}.csv"

        # Export to CSV for compatibility with training scripts
        df.to_csv(output_path, index=False)

        logger.info(f"Exported {len(df)} outcomes to {output_path}")

        return str(output_path)

    def list_properties(self) -> List[str]:
        """List all properties with stored outcomes"""
        property_files = self.storage_dir.glob('*_outcomes.parquet')
        properties = [f.stem.replace('_outcomes', '') for f in property_files]
        return sorted(properties)

    def delete_outcomes(self, property_id: str, before_date: Optional[str] = None):
        """
        Delete outcomes for a property

        Args:
            property_id: Property UUID
            before_date: Optional date to delete outcomes before
        """
        filepath = self.storage_dir / f"{property_id}_outcomes.parquet"

        if not filepath.exists():
            logger.warning(f"No outcomes file found for property {property_id}")
            return

        if before_date:
            # Load, filter, and save
            df = pd.read_parquet(filepath)
            filtered_df = df[df['timestamp'] >= pd.to_datetime(before_date)]

            if len(filtered_df) == 0:
                # Delete entire file
                filepath.unlink()
                logger.info(f"Deleted all outcomes for property {property_id}")
            else:
                # Save filtered data
                filtered_df.to_parquet(filepath, index=False)
                deleted_count = len(df) - len(filtered_df)
                logger.info(f"Deleted {deleted_count} outcomes before {before_date}")
        else:
            # Delete entire file
            filepath.unlink()
            logger.info(f"Deleted all outcomes for property {property_id}")


# Global instance
_outcomes_storage: Optional[OutcomesStorage] = None


def get_outcomes_storage() -> OutcomesStorage:
    """Get global outcomes storage instance"""
    global _outcomes_storage
    if _outcomes_storage is None:
        _outcomes_storage = OutcomesStorage()
    return _outcomes_storage
