"""Deep correlation and feature importance analysis"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from scipy import stats
from scipy.stats import f_oneway
from joblib import Memory
import warnings

from ..utils.logging import get_logger

logger = get_logger(__name__)

# Setup caching
memory = Memory("data/cache/correlation_cache", verbose=0)

# Try to import sklearn, but don't fail if not available
try:
    from sklearn.feature_selection import mutual_info_regression
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("sklearn_not_available", message="Mutual Information will be skipped")


@memory.cache
def compute_pearson_correlation(
    df: pd.DataFrame,
    target: str,
    features: List[str]
) -> pd.DataFrame:
    """
    Compute Pearson correlation (linear relationships)

    Args:
        df: DataFrame with data
        target: Target column name (e.g., 'bookings', 'revenue')
        features: List of feature column names

    Returns:
        DataFrame with feature, correlation, p_value
    """
    logger.info("computing_pearson", target=target, features=len(features))

    results = []

    for feature in features:
        # Skip if too many missing values
        if df[feature].isna().sum() > len(df) * 0.5:
            continue

        try:
            # Drop rows with NaN in either column
            valid_data = df[[feature, target]].dropna()

            if len(valid_data) < 10:  # Need at least 10 samples
                continue

            corr, p_value = stats.pearsonr(valid_data[feature], valid_data[target])

            results.append({
                'feature': feature,
                'correlation': corr,
                'p_value': p_value,
                'method': 'pearson'
            })

        except Exception as e:
            logger.warning("pearson_failed", feature=feature, error=str(e))

    return pd.DataFrame(results)


@memory.cache
def compute_spearman_correlation(
    df: pd.DataFrame,
    target: str,
    features: List[str]
) -> pd.DataFrame:
    """
    Compute Spearman correlation (monotonic relationships)

    Args:
        df: DataFrame with data
        target: Target column name
        features: List of feature column names

    Returns:
        DataFrame with feature, correlation, p_value
    """
    logger.info("computing_spearman", target=target, features=len(features))

    results = []

    for feature in features:
        if df[feature].isna().sum() > len(df) * 0.5:
            continue

        try:
            valid_data = df[[feature, target]].dropna()

            if len(valid_data) < 10:
                continue

            corr, p_value = stats.spearmanr(valid_data[feature], valid_data[target])

            results.append({
                'feature': feature,
                'correlation': corr,
                'p_value': p_value,
                'method': 'spearman'
            })

        except Exception as e:
            logger.warning("spearman_failed", feature=feature, error=str(e))

    return pd.DataFrame(results)


@memory.cache
def compute_mutual_information(
    df: pd.DataFrame,
    target: str,
    features: List[str],
    random_state: int = 42
) -> pd.DataFrame:
    """
    Compute Mutual Information (nonlinear relationships)

    Args:
        df: DataFrame with data
        target: Target column name
        features: List of feature column names
        random_state: Random seed

    Returns:
        DataFrame with feature, mi_score
    """
    if not SKLEARN_AVAILABLE:
        logger.warning("sklearn_unavailable", message="Skipping mutual information")
        return pd.DataFrame(columns=['feature', 'mi_score', 'method'])

    logger.info("computing_mutual_info", target=target, features=len(features))

    # Prepare data
    X = df[features].copy()
    y = df[target].copy()

    # Drop rows with NaN
    valid_mask = ~(X.isna().any(axis=1) | y.isna())
    X = X[valid_mask]
    y = y[valid_mask]

    if len(X) < 10:
        return pd.DataFrame(columns=['feature', 'mi_score', 'method'])

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            mi_scores = mutual_info_regression(X, y, random_state=random_state)

        results = []
        for feature, score in zip(features, mi_scores):
            results.append({
                'feature': feature,
                'mi_score': score,
                'method': 'mutual_info'
            })

        return pd.DataFrame(results)

    except Exception as e:
        logger.error("mutual_info_failed", error=str(e))
        return pd.DataFrame(columns=['feature', 'mi_score', 'method'])


def compute_lag_correlations(
    df: pd.DataFrame,
    target: str,
    feature: str,
    max_lag: int = 7
) -> pd.DataFrame:
    """
    Compute lagged correlations (temporal relationships)

    Args:
        df: DataFrame sorted by date
        target: Target column
        feature: Feature to lag
        max_lag: Maximum lag in days

    Returns:
        DataFrame with lag, correlation
    """
    logger.info("computing_lag_correlations", feature=feature, max_lag=max_lag)

    results = []

    for lag in range(-max_lag, max_lag + 1):
        try:
            if lag == 0:
                lagged_feature = df[feature]
            elif lag > 0:
                lagged_feature = df[feature].shift(lag)
            else:
                lagged_feature = df[feature].shift(lag)

            valid_data = pd.DataFrame({
                'target': df[target],
                'feature': lagged_feature
            }).dropna()

            if len(valid_data) < 10:
                continue

            corr, p_value = stats.pearsonr(valid_data['target'], valid_data['feature'])

            results.append({
                'lag': lag,
                'correlation': corr,
                'p_value': p_value
            })

        except Exception as e:
            logger.warning("lag_correlation_failed", lag=lag, error=str(e))

    return pd.DataFrame(results)


def compute_anova_categorical(
    df: pd.DataFrame,
    target: str,
    categorical_features: List[str]
) -> pd.DataFrame:
    """
    Compute ANOVA F-test for categorical features

    Args:
        df: DataFrame
        target: Target column
        categorical_features: List of categorical column names

    Returns:
        DataFrame with feature, f_statistic, p_value
    """
    logger.info("computing_anova", target=target, features=len(categorical_features))

    results = []

    for feature in categorical_features:
        try:
            # Group target by category
            groups = [group[target].dropna().values for name, group in df.groupby(feature)]

            # Need at least 2 groups
            if len(groups) < 2:
                continue

            f_stat, p_value = f_oneway(*groups)

            # Calculate eta-squared (effect size)
            grand_mean = df[target].mean()
            ss_between = sum([len(g) * (np.mean(g) - grand_mean)**2 for g in groups])
            ss_total = sum([(x - grand_mean)**2 for g in groups for x in g])
            eta_squared = ss_between / ss_total if ss_total > 0 else 0

            results.append({
                'feature': feature,
                'f_statistic': f_stat,
                'p_value': p_value,
                'eta_squared': eta_squared,
                'method': 'anova'
            })

        except Exception as e:
            logger.warning("anova_failed", feature=feature, error=str(e))

    return pd.DataFrame(results)


def compute_correlations(
    df: pd.DataFrame,
    target: str = "bookings",
    numeric_features: Optional[List[str]] = None,
    categorical_features: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Compute all correlation methods

    Args:
        df: DataFrame with enriched data
        target: Target variable
        numeric_features: List of numeric features (auto-detect if None)
        categorical_features: List of categorical features (auto-detect if None)

    Returns:
        DataFrame with all correlation results
    """
    logger.info("computing_all_correlations", target=target, rows=len(df))

    # Auto-detect features if not provided
    if numeric_features is None:
        numeric_features = df.select_dtypes(include=[np.number]).columns.tolist()
        # Remove target and ID-like columns
        exclude_patterns = [target, 'id', 'date', 'year']
        numeric_features = [
            col for col in numeric_features
            if not any(pattern in col.lower() for pattern in exclude_patterns)
        ]

    if categorical_features is None:
        categorical_features = df.select_dtypes(include=['object', 'category']).columns.tolist()
        # Exclude text fields
        categorical_features = [
            col for col in categorical_features
            if df[col].nunique() < 50  # Reasonable number of categories
        ]

    logger.info("features_detected", numeric=len(numeric_features), categorical=len(categorical_features))

    all_results = []

    # Pearson
    pearson_df = compute_pearson_correlation(df, target, numeric_features)
    all_results.append(pearson_df)

    # Spearman
    spearman_df = compute_spearman_correlation(df, target, numeric_features)
    all_results.append(spearman_df)

    # Mutual Information
    if SKLEARN_AVAILABLE:
        mi_df = compute_mutual_information(df, target, numeric_features)
        all_results.append(mi_df)

    # ANOVA for categorical
    if categorical_features:
        anova_df = compute_anova_categorical(df, target, categorical_features)
        all_results.append(anova_df)

    # Combine all results
    combined = pd.concat([df for df in all_results if not df.empty], ignore_index=True)

    logger.info("correlations_computed", total_features=len(combined))

    return combined


def rank_top_features(
    correlations_df: pd.DataFrame,
    top_n: int = 20
) -> pd.DataFrame:
    """
    Rank features by combined importance

    Args:
        correlations_df: DataFrame from compute_correlations
        top_n: Number of top features to return

    Returns:
        DataFrame with ranked features and scores
    """
    logger.info("ranking_features", top_n=top_n)

    # Group by feature
    feature_groups = correlations_df.groupby('feature')

    rankings = []

    for feature, group in feature_groups:
        scores = {}

        # Pearson
        pearson = group[group['method'] == 'pearson']
        if not pearson.empty:
            scores['pearson'] = abs(pearson['correlation'].iloc[0])

        # Spearman
        spearman = group[group['method'] == 'spearman']
        if not spearman.empty:
            scores['spearman'] = abs(spearman['correlation'].iloc[0])

        # Mutual Info (normalize to 0-1)
        mi = group[group['method'] == 'mutual_info']
        if not mi.empty:
            scores['mi'] = mi['mi_score'].iloc[0]

        # ANOVA (use eta-squared)
        anova = group[group['method'] == 'anova']
        if not anova.empty:
            scores['anova'] = anova['eta_squared'].iloc[0]

        # Combined score (weighted average)
        if scores:
            combined_score = np.mean(list(scores.values()))

            rankings.append({
                'feature': feature,
                'combined_score': combined_score,
                **scores
            })

    # Sort by combined score
    rankings_df = pd.DataFrame(rankings).sort_values('combined_score', ascending=False)

    logger.info("features_ranked", top_feature=rankings_df.iloc[0]['feature'] if not rankings_df.empty else None)

    return rankings_df.head(top_n)


def save_correlation_results(
    correlations_df: pd.DataFrame,
    rankings_df: pd.DataFrame,
    output_dir: Path = Path("data/analysis")
) -> Tuple[Path, Path]:
    """
    Save correlation results

    Args:
        correlations_df: All correlations
        rankings_df: Ranked features
        output_dir: Output directory

    Returns:
        Tuple of (correlations_path, rankings_path)
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    corr_path = output_dir / "correlations_summary.parquet"
    rank_path = output_dir / "feature_rankings.parquet"

    correlations_df.to_parquet(corr_path, index=False)
    rankings_df.to_parquet(rank_path, index=False)

    logger.info("correlation_results_saved", corr_path=str(corr_path), rank_path=str(rank_path))

    return corr_path, rank_path
