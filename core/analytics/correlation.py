"""Advanced correlation analysis for pricing factors"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats
from sklearn.feature_selection import mutual_info_regression

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class CorrelationResult:
    """Correlation analysis result"""
    feature1: str
    feature2: str
    correlation: float
    p_value: float
    method: str
    strength: str  # 'weak', 'moderate', 'strong', 'very_strong'
    direction: str  # 'positive', 'negative', 'none'

    def to_dict(self) -> Dict:
        return {
            'feature1': self.feature1,
            'feature2': self.feature2,
            'correlation': self.correlation,
            'p_value': self.p_value,
            'method': self.method,
            'strength': self.strength,
            'direction': self.direction
        }


class CorrelationAnalyzer:
    """
    Advanced correlation discovery engine
    Finds relationships between pricing factors and demand/revenue
    """

    def __init__(self, significance_level: float = 0.05):
        """
        Initialize correlation analyzer

        Args:
            significance_level: P-value threshold for significance
        """
        self.significance_level = significance_level
        self.correlation_matrix: Optional[pd.DataFrame] = None
        self.correlation_results: List[CorrelationResult] = []

    def _classify_strength(self, correlation: float) -> str:
        """Classify correlation strength"""
        abs_corr = abs(correlation)
        if abs_corr >= 0.8:
            return 'very_strong'
        elif abs_corr >= 0.6:
            return 'strong'
        elif abs_corr >= 0.3:
            return 'moderate'
        else:
            return 'weak'

    def _classify_direction(self, correlation: float) -> str:
        """Classify correlation direction"""
        if abs(correlation) < 0.1:
            return 'none'
        return 'positive' if correlation > 0 else 'negative'

    def pearson_correlation(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str
    ) -> pd.DataFrame:
        """
        Calculate Pearson correlation coefficients

        Args:
            df: DataFrame with data
            feature_cols: Feature column names
            target_col: Target column name

        Returns:
            DataFrame with correlation results
        """
        logger.info("calculating_pearson_correlation", num_features=len(feature_cols))

        results = []
        for feature in feature_cols:
            if feature in df.columns and target_col in df.columns:
                # Remove NaN values
                valid_data = df[[feature, target_col]].dropna()

                if len(valid_data) > 2:
                    corr, p_value = stats.pearsonr(valid_data[feature], valid_data[target_col])

                    result = CorrelationResult(
                        feature1=feature,
                        feature2=target_col,
                        correlation=corr,
                        p_value=p_value,
                        method='pearson',
                        strength=self._classify_strength(corr),
                        direction=self._classify_direction(corr)
                    )
                    results.append(result)

        self.correlation_results.extend(results)
        return pd.DataFrame([r.to_dict() for r in results])

    def spearman_correlation(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str
    ) -> pd.DataFrame:
        """
        Calculate Spearman rank correlation (for non-linear relationships)

        Args:
            df: DataFrame with data
            feature_cols: Feature column names
            target_col: Target column name

        Returns:
            DataFrame with correlation results
        """
        logger.info("calculating_spearman_correlation", num_features=len(feature_cols))

        results = []
        for feature in feature_cols:
            if feature in df.columns and target_col in df.columns:
                valid_data = df[[feature, target_col]].dropna()

                if len(valid_data) > 2:
                    corr, p_value = stats.spearmanr(valid_data[feature], valid_data[target_col])

                    result = CorrelationResult(
                        feature1=feature,
                        feature2=target_col,
                        correlation=corr,
                        p_value=p_value,
                        method='spearman',
                        strength=self._classify_strength(corr),
                        direction=self._classify_direction(corr)
                    )
                    results.append(result)

        return pd.DataFrame([r.to_dict() for r in results])

    def mutual_information(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str,
        n_neighbors: int = 3
    ) -> pd.DataFrame:
        """
        Calculate mutual information (captures non-linear dependencies)

        Args:
            df: DataFrame with data
            feature_cols: Feature column names
            target_col: Target column name
            n_neighbors: Number of neighbors for MI estimation

        Returns:
            DataFrame with MI scores
        """
        logger.info("calculating_mutual_information", num_features=len(feature_cols))

        valid_data = df[feature_cols + [target_col]].dropna()

        if len(valid_data) < 5:
            logger.warning("insufficient_data_for_mi")
            return pd.DataFrame()

        X = valid_data[feature_cols]
        y = valid_data[target_col]

        mi_scores = mutual_info_regression(X, y, n_neighbors=n_neighbors, random_state=42)

        results = pd.DataFrame({
            'feature': feature_cols,
            'mutual_information': mi_scores,
            'normalized_mi': mi_scores / mi_scores.max() if mi_scores.max() > 0 else mi_scores
        }).sort_values('mutual_information', ascending=False)

        return results

    def compute_correlation_matrix(
        self,
        df: pd.DataFrame,
        columns: Optional[List[str]] = None,
        method: str = 'pearson'
    ) -> pd.DataFrame:
        """
        Compute full correlation matrix

        Args:
            df: DataFrame with data
            columns: Columns to include (None = all numeric)
            method: 'pearson', 'spearman', or 'kendall'

        Returns:
            Correlation matrix DataFrame
        """
        logger.info("computing_correlation_matrix", method=method)

        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()

        self.correlation_matrix = df[columns].corr(method=method)
        return self.correlation_matrix

    def find_strong_correlations(
        self,
        threshold: float = 0.6,
        exclude_self: bool = True
    ) -> pd.DataFrame:
        """
        Find pairs of features with strong correlation

        Args:
            threshold: Minimum absolute correlation value
            exclude_self: Exclude perfect self-correlations

        Returns:
            DataFrame with strong correlation pairs
        """
        if self.correlation_matrix is None:
            logger.error("correlation_matrix_not_computed")
            return pd.DataFrame()

        # Get upper triangle to avoid duplicates
        mask = np.triu(np.ones_like(self.correlation_matrix, dtype=bool), k=1 if exclude_self else 0)

        # Find strong correlations
        strong_corr = []
        for i in range(len(self.correlation_matrix)):
            for j in range(i+1 if exclude_self else i, len(self.correlation_matrix)):
                corr_value = self.correlation_matrix.iloc[i, j]
                if abs(corr_value) >= threshold:
                    strong_corr.append({
                        'feature1': self.correlation_matrix.index[i],
                        'feature2': self.correlation_matrix.columns[j],
                        'correlation': corr_value,
                        'strength': self._classify_strength(corr_value),
                        'direction': self._classify_direction(corr_value)
                    })

        return pd.DataFrame(strong_corr).sort_values('correlation', key=abs, ascending=False)

    def analyze_price_drivers(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        price_col: str = 'final_price',
        demand_col: str = 'daily_demand'
    ) -> Dict[str, pd.DataFrame]:
        """
        Comprehensive analysis of what drives pricing and demand

        Args:
            df: DataFrame with booking data
            feature_cols: Feature columns to analyze
            price_col: Price column name
            demand_col: Demand column name

        Returns:
            Dictionary of analysis results
        """
        logger.info("analyzing_price_drivers", num_features=len(feature_cols))

        results = {}

        # Pearson correlation with price
        results['price_pearson'] = self.pearson_correlation(df, feature_cols, price_col)

        # Spearman correlation with price (non-linear)
        results['price_spearman'] = self.spearman_correlation(df, feature_cols, price_col)

        # Mutual information with price
        results['price_mi'] = self.mutual_information(df, feature_cols, price_col)

        # Pearson correlation with demand
        results['demand_pearson'] = self.pearson_correlation(df, feature_cols, demand_col)

        # Spearman correlation with demand
        results['demand_spearman'] = self.spearman_correlation(df, feature_cols, demand_col)

        # Mutual information with demand
        results['demand_mi'] = self.mutual_information(df, feature_cols, demand_col)

        # Full correlation matrix
        all_cols = feature_cols + [price_col, demand_col]
        results['correlation_matrix'] = self.compute_correlation_matrix(df, all_cols)

        # Strong correlations
        results['strong_correlations'] = self.find_strong_correlations(threshold=0.5)

        logger.info("price_driver_analysis_complete", num_results=len(results))
        return results

    def get_top_features(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str,
        n: int = 10,
        method: str = 'pearson'
    ) -> pd.DataFrame:
        """
        Get top N features most correlated with target

        Args:
            df: DataFrame with data
            feature_cols: Feature columns
            target_col: Target column
            n: Number of top features
            method: Correlation method

        Returns:
            DataFrame with top features sorted by correlation strength
        """
        if method == 'pearson':
            correlations = self.pearson_correlation(df, feature_cols, target_col)
        elif method == 'spearman':
            correlations = self.spearman_correlation(df, feature_cols, target_col)
        else:
            raise ValueError(f"Unknown method: {method}")

        # Sort by absolute correlation
        correlations['abs_correlation'] = correlations['correlation'].abs()
        top_features = correlations.nlargest(n, 'abs_correlation')

        return top_features.drop('abs_correlation', axis=1)


def discover_correlations(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str,
    methods: List[str] = ['pearson', 'spearman', 'mi']
) -> Dict[str, pd.DataFrame]:
    """
    Convenience function to discover correlations using multiple methods

    Args:
        df: DataFrame with data
        feature_cols: Feature columns to analyze
        target_col: Target column
        methods: List of methods to use

    Returns:
        Dictionary of correlation results by method
    """
    analyzer = CorrelationAnalyzer()
    results = {}

    if 'pearson' in methods:
        results['pearson'] = analyzer.pearson_correlation(df, feature_cols, target_col)

    if 'spearman' in methods:
        results['spearman'] = analyzer.spearman_correlation(df, feature_cols, target_col)

    if 'mi' in methods:
        results['mutual_information'] = analyzer.mutual_information(df, feature_cols, target_col)

    return results
