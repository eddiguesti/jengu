"""Feature encoders for categorical variables"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from typing import Optional, List, Union


class DestinationEncoder:
    """Encoder for destination categorical variable"""

    def __init__(self, encoding_type: str = 'label'):
        """
        Initialize encoder

        Args:
            encoding_type: 'label' or 'onehot'
        """
        self.encoding_type = encoding_type
        self.encoder: Optional[Union[LabelEncoder, OneHotEncoder]] = None
        self.categories_: Optional[List[str]] = None

    def fit(self, destinations: pd.Series) -> 'DestinationEncoder':
        """Fit encoder on destination data"""
        if self.encoding_type == 'label':
            self.encoder = LabelEncoder()
            self.encoder.fit(destinations)
        elif self.encoding_type == 'onehot':
            self.encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            self.encoder.fit(destinations.values.reshape(-1, 1))
        else:
            raise ValueError(f"Unknown encoding type: {self.encoding_type}")

        self.categories_ = sorted(destinations.unique())
        return self

    def transform(self, destinations: pd.Series) -> np.ndarray:
        """Transform destinations to encoded values"""
        if self.encoder is None:
            raise ValueError("Encoder not fitted. Call fit() first.")

        if self.encoding_type == 'label':
            return self.encoder.transform(destinations)
        else:
            return self.encoder.transform(destinations.values.reshape(-1, 1))

    def fit_transform(self, destinations: pd.Series) -> np.ndarray:
        """Fit and transform in one step"""
        return self.fit(destinations).transform(destinations)

    def inverse_transform(self, encoded: np.ndarray) -> np.ndarray:
        """Convert encoded values back to original destinations"""
        if self.encoder is None:
            raise ValueError("Encoder not fitted.")

        return self.encoder.inverse_transform(encoded)


class SeasonEncoder:
    """Encoder for season categorical variable"""

    # Fixed mapping to preserve order
    SEASON_ORDER = {
        'Low': 0,
        'Mid': 1,
        'High': 2,
        'Peak': 3
    }

    def __init__(self, encoding_type: str = 'ordinal'):
        """
        Initialize encoder

        Args:
            encoding_type: 'ordinal' or 'onehot'
        """
        self.encoding_type = encoding_type
        self.encoder: Optional[OneHotEncoder] = None

    def fit(self, seasons: pd.Series) -> 'SeasonEncoder':
        """Fit encoder on season data"""
        if self.encoding_type == 'onehot':
            self.encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            self.encoder.fit(seasons.values.reshape(-1, 1))
        return self

    def transform(self, seasons: pd.Series) -> np.ndarray:
        """Transform seasons to encoded values"""
        if self.encoding_type == 'ordinal':
            return seasons.map(self.SEASON_ORDER).values
        elif self.encoding_type == 'onehot':
            if self.encoder is None:
                raise ValueError("Encoder not fitted. Call fit() first.")
            return self.encoder.transform(seasons.values.reshape(-1, 1))
        else:
            raise ValueError(f"Unknown encoding type: {self.encoding_type}")

    def fit_transform(self, seasons: pd.Series) -> np.ndarray:
        """Fit and transform in one step"""
        return self.fit(seasons).transform(seasons)


class AccommodationEncoder:
    """Encoder for accommodation type categorical variable"""

    # Fixed mapping to preserve order
    ACCOMMODATION_ORDER = {
        'Budget': 0,
        'Standard': 1,
        'Premium': 2,
        'Luxury': 3
    }

    def __init__(self, encoding_type: str = 'ordinal'):
        """
        Initialize encoder

        Args:
            encoding_type: 'ordinal' or 'onehot'
        """
        self.encoding_type = encoding_type
        self.encoder: Optional[OneHotEncoder] = None

    def fit(self, accommodation_types: pd.Series) -> 'AccommodationEncoder':
        """Fit encoder on accommodation type data"""
        if self.encoding_type == 'onehot':
            self.encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            self.encoder.fit(accommodation_types.values.reshape(-1, 1))
        return self

    def transform(self, accommodation_types: pd.Series) -> np.ndarray:
        """Transform accommodation types to encoded values"""
        if self.encoding_type == 'ordinal':
            return accommodation_types.map(self.ACCOMMODATION_ORDER).values
        elif self.encoding_type == 'onehot':
            if self.encoder is None:
                raise ValueError("Encoder not fitted. Call fit() first.")
            return self.encoder.transform(accommodation_types.values.reshape(-1, 1))
        else:
            raise ValueError(f"Unknown encoding type: {self.encoding_type}")

    def fit_transform(self, accommodation_types: pd.Series) -> np.ndarray:
        """Fit and transform in one step"""
        return self.fit(accommodation_types).transform(accommodation_types)


class CyclicalEncoder:
    """Encode cyclical features (day of week, month) as sin/cos"""

    def __init__(self, period: int):
        """
        Initialize encoder

        Args:
            period: Cycle period (e.g., 7 for day of week, 12 for month)
        """
        self.period = period

    def transform(self, values: pd.Series) -> pd.DataFrame:
        """
        Transform cyclical values to sin/cos encoding

        Args:
            values: Series with cyclical values (0-indexed)

        Returns:
            DataFrame with sin and cos columns
        """
        angle = 2 * np.pi * values / self.period
        return pd.DataFrame({
            f'{values.name}_sin': np.sin(angle),
            f'{values.name}_cos': np.cos(angle)
        })

    def fit_transform(self, values: pd.Series) -> pd.DataFrame:
        """Fit and transform (no fitting needed for cyclical encoding)"""
        return self.transform(values)
