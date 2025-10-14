"""
Competition-specific correlation analysis
Extends the base correlation engine with competitive intelligence metrics
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from scipy import stats
from sklearn.linear_model import LinearRegression

from core.utils.logging import get_logger
from core.models.competitor import CompetitorRepository
from core.services.competitor_intelligence import CompetitorIntelligenceService

logger = get_logger(__name__)


class CompetitionCorrelationAnalyzer:
    """
    Analyze correlations between our metrics and competitor metrics
    """

    def __init__(
        self,
        service: Optional[CompetitorIntelligenceService] = None,
        repository: Optional[CompetitorRepository] = None
    ):
        """
        Initialize analyzer

        Args:
            service: CompetitorIntelligenceService instance
            repository: CompetitorRepository instance
        """
        self.service = service or CompetitorIntelligenceService()
        self.repository = repository or self.service.repository

    def enrich_with_competition_features(
        self,
        df: pd.DataFrame,
        date_col: str = "date",
        price_col: str = "price"
    ) -> pd.DataFrame:
        """
        Add competition features to existing dataset

        Features added:
            - median_comp_price: Median competitor price
            - mean_comp_price: Mean competitor price
            - comp_gap: Our price - median competitor price
            - comp_gap_z: Z-score normalized comp_gap
            - num_competitors: Number of competitors observed
            - airbnb_adr: Airbnb market ADR
            - airbnb_occupancy: Airbnb market occupancy

        Args:
            df: DataFrame with our data
            date_col: Date column name
            price_col: Price column name

        Returns:
            DataFrame with added competition features
        """
        logger.info("enriching_with_competition_features", rows=len(df))

        # Load all competitor observations
        comp_df = self.repository.load_observations()

        if comp_df.empty:
            logger.warning("no_competitor_data_available")
            # Return with null columns
            df['median_comp_price'] = np.nan
            df['mean_comp_price'] = np.nan
            df['comp_gap'] = np.nan
            df['comp_gap_z'] = np.nan
            df['num_competitors'] = 0
            df['airbnb_adr'] = np.nan
            df['airbnb_occupancy'] = np.nan
            return df

        # Ensure dates are datetime
        df = df.copy()
        df[date_col] = pd.to_datetime(df[date_col])
        comp_df['date'] = pd.to_datetime(comp_df['date'])

        # 1. Aggregate hotel competitor prices by date
        hotel_comp = comp_df[comp_df['comp_id'].str.startswith('hotel')]
        if not hotel_comp.empty:
            hotel_agg = hotel_comp.groupby('date').agg({
                'price': ['median', 'mean', 'std', 'count']
            }).reset_index()
            hotel_agg.columns = ['date', 'median_comp_price', 'mean_comp_price', 'std_comp_price', 'num_competitors']
        else:
            hotel_agg = pd.DataFrame(columns=['date', 'median_comp_price', 'mean_comp_price', 'std_comp_price', 'num_competitors'])

        # 2. Aggregate Airbnb market metrics by date
        airbnb_comp = comp_df[comp_df['comp_id'].str.startswith('airbnb')]
        if not airbnb_comp.empty:
            airbnb_agg = airbnb_comp.groupby('date').agg({
                'price': 'mean',  # ADR
                'occupancy': 'mean'
            }).reset_index()
            airbnb_agg.columns = ['date', 'airbnb_adr', 'airbnb_occupancy']
        else:
            airbnb_agg = pd.DataFrame(columns=['date', 'airbnb_adr', 'airbnb_occupancy'])

        # 3. Merge with our data
        enriched = df.copy()

        # Merge hotel competitors
        if not hotel_agg.empty:
            enriched = pd.merge(
                enriched,
                hotel_agg,
                left_on=date_col,
                right_on='date',
                how='left',
                suffixes=('', '_comp')
            )
        else:
            enriched['median_comp_price'] = np.nan
            enriched['mean_comp_price'] = np.nan
            enriched['std_comp_price'] = np.nan
            enriched['num_competitors'] = 0

        # Merge Airbnb markets
        if not airbnb_agg.empty:
            enriched = pd.merge(
                enriched,
                airbnb_agg,
                left_on=date_col,
                right_on='date',
                how='left',
                suffixes=('', '_airbnb')
            )
        else:
            enriched['airbnb_adr'] = np.nan
            enriched['airbnb_occupancy'] = np.nan

        # 4. Compute competitive gap
        if price_col in enriched.columns and 'median_comp_price' in enriched.columns:
            enriched['comp_gap'] = enriched[price_col] - enriched['median_comp_price']

            # Z-score normalization (only where gap exists)
            valid_gap = enriched['comp_gap'].dropna()
            if len(valid_gap) > 1:
                mean_gap = valid_gap.mean()
                std_gap = valid_gap.std()
                enriched['comp_gap_z'] = (enriched['comp_gap'] - mean_gap) / std_gap
            else:
                enriched['comp_gap_z'] = np.nan
        else:
            enriched['comp_gap'] = np.nan
            enriched['comp_gap_z'] = np.nan

        # Fill missing num_competitors with 0
        enriched['num_competitors'] = enriched.get('num_competitors', 0).fillna(0)

        logger.info(
            "competition_features_added",
            hotel_competitors=hotel_agg['num_competitors'].mean() if not hotel_agg.empty else 0,
            airbnb_markets=len(airbnb_comp['comp_id'].unique()) if not airbnb_comp.empty else 0
        )

        return enriched

    def compute_lag_correlations_with_competition(
        self,
        df: pd.DataFrame,
        target: str = "occupancy",
        comp_features: Optional[List[str]] = None,
        max_lag: int = 7
    ) -> pd.DataFrame:
        """
        Compute lagged correlations between target and competition features

        corr(occupancy_t, comp_gap_{t+k}), k ∈ [-7, 7]

        Args:
            df: DataFrame with target and competition features
            target: Target column (e.g., 'occupancy', 'bookings')
            comp_features: List of competition features to analyze
            max_lag: Maximum lag in days

        Returns:
            DataFrame with feature, lag, correlation, p_value
        """
        if comp_features is None:
            comp_features = [
                'comp_gap',
                'comp_gap_z',
                'median_comp_price',
                'airbnb_adr',
                'airbnb_occupancy'
            ]

        # Filter to features that exist
        comp_features = [f for f in comp_features if f in df.columns]

        if not comp_features:
            logger.warning("no_competition_features_found")
            return pd.DataFrame()

        logger.info(
            "computing_lag_correlations",
            target=target,
            features=len(comp_features),
            max_lag=max_lag
        )

        results = []

        for feature in comp_features:
            for lag in range(-max_lag, max_lag + 1):
                try:
                    if lag == 0:
                        lagged_feature = df[feature]
                    else:
                        lagged_feature = df[feature].shift(lag)

                    valid_data = pd.DataFrame({
                        'target': df[target],
                        'feature': lagged_feature
                    }).dropna()

                    if len(valid_data) < 10:
                        continue

                    corr, p_value = stats.pearsonr(
                        valid_data['target'],
                        valid_data['feature']
                    )

                    results.append({
                        'feature': feature,
                        'lag': lag,
                        'correlation': corr,
                        'p_value': p_value,
                        'abs_correlation': abs(corr)
                    })

                except Exception as e:
                    logger.warning(
                        "lag_correlation_failed",
                        feature=feature,
                        lag=lag,
                        error=str(e)
                    )

        results_df = pd.DataFrame(results)

        if not results_df.empty:
            # Find best lag for each feature
            best_lags = results_df.loc[
                results_df.groupby('feature')['abs_correlation'].idxmax()
            ]
            logger.info(
                "best_lags_found",
                best_lags=best_lags[['feature', 'lag', 'correlation']].to_dict('records')
            )

        return results_df

    def compute_competitive_elasticity(
        self,
        df: pd.DataFrame,
        target: str = "occupancy",
        price_col: str = "price"
    ) -> Dict[str, any]:
        """
        Compute competitive elasticity using OLS regression

        Model:
            occupancy_t = β0 + β1*comp_gap_t + β2*airbnb_adr_t + β3*airbnb_occupancy_t + ε_t

        Args:
            df: DataFrame with target and competition features
            target: Target column (dependent variable)
            price_col: Our price column

        Returns:
            Dictionary with coefficients, R², p-values
        """
        logger.info("computing_competitive_elasticity", target=target)

        # Prepare features
        feature_cols = []
        if 'comp_gap' in df.columns:
            feature_cols.append('comp_gap')
        if 'airbnb_adr' in df.columns:
            feature_cols.append('airbnb_adr')
        if 'airbnb_occupancy' in df.columns:
            feature_cols.append('airbnb_occupancy')

        if not feature_cols:
            logger.warning("no_competition_features_for_regression")
            return {
                "coefficients": {},
                "r_squared": 0.0,
                "error": "No competition features available"
            }

        # Drop rows with missing values
        required_cols = [target] + feature_cols
        valid_df = df[required_cols].dropna()

        if len(valid_df) < 20:
            logger.warning("insufficient_data_for_regression", valid_rows=len(valid_df))
            return {
                "coefficients": {},
                "r_squared": 0.0,
                "error": "Insufficient data"
            }

        # Prepare X and y
        X = valid_df[feature_cols].values
        y = valid_df[target].values

        # Fit model
        try:
            model = LinearRegression()
            model.fit(X, y)

            # Get statistics
            y_pred = model.predict(X)
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r_squared = 1 - (ss_res / ss_tot)

            # Build results
            coefficients = {
                "intercept": float(model.intercept_)
            }

            for feature, coef in zip(feature_cols, model.coef_):
                coefficients[feature] = float(coef)

            results = {
                "coefficients": coefficients,
                "r_squared": float(r_squared),
                "n_samples": len(valid_df),
                "features": feature_cols,
                "formula": f"{target} = {model.intercept_:.3f} + " + " + ".join([
                    f"{coef:.3f}*{feat}" for feat, coef in zip(feature_cols, model.coef_)
                ])
            }

            logger.info(
                "competitive_elasticity_computed",
                r_squared=r_squared,
                comp_gap_coef=coefficients.get('comp_gap', 'N/A')
            )

            return results

        except Exception as e:
            logger.error("competitive_elasticity_failed", error=str(e))
            return {
                "coefficients": {},
                "r_squared": 0.0,
                "error": str(e)
            }

    def generate_competition_report(
        self,
        df: pd.DataFrame,
        target: str = "occupancy",
        price_col: str = "price"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive competition correlation report

        Args:
            df: DataFrame with our data and competition features
            target: Target variable
            price_col: Price column

        Returns:
            Dictionary with all analysis results
        """
        logger.info("generating_competition_report")

        report = {
            "data_summary": {
                "total_rows": len(df),
                "date_range": {
                    "start": str(df['date'].min()) if 'date' in df.columns else None,
                    "end": str(df['date'].max()) if 'date' in df.columns else None
                }
            },
            "competition_features": {},
            "lag_correlations": {},
            "elasticity": {}
        }

        # Competition features summary
        comp_features = [
            'median_comp_price', 'comp_gap', 'comp_gap_z',
            'airbnb_adr', 'airbnb_occupancy'
        ]

        for feature in comp_features:
            if feature in df.columns:
                report["competition_features"][feature] = {
                    "mean": float(df[feature].mean()) if not df[feature].isna().all() else None,
                    "std": float(df[feature].std()) if not df[feature].isna().all() else None,
                    "coverage": float((~df[feature].isna()).sum() / len(df))
                }

        # Lag correlations
        lag_df = self.compute_lag_correlations_with_competition(df, target)
        if not lag_df.empty:
            # Group by feature and find best lag
            for feature in lag_df['feature'].unique():
                feature_data = lag_df[lag_df['feature'] == feature]
                best_row = feature_data.loc[feature_data['abs_correlation'].idxmax()]

                report["lag_correlations"][feature] = {
                    "best_lag": int(best_row['lag']),
                    "correlation": float(best_row['correlation']),
                    "p_value": float(best_row['p_value'])
                }

        # Competitive elasticity
        elasticity = self.compute_competitive_elasticity(df, target, price_col)
        report["elasticity"] = elasticity

        logger.info("competition_report_generated")
        return report


# ===== Convenience Functions =====

def add_competition_to_correlations(
    base_correlations: pd.DataFrame,
    competition_df: pd.DataFrame,
    target: str = "occupancy"
) -> pd.DataFrame:
    """
    Add competition correlations to base correlation results

    Args:
        base_correlations: Existing correlation results
        competition_df: DataFrame with competition features
        target: Target column

        Returns:
        Combined correlation DataFrame
    """
    from core.analysis.correlations import compute_pearson_correlation, compute_spearman_correlation

    # Get competition features
    comp_features = [
        col for col in competition_df.columns
        if any(x in col for x in ['comp_', 'airbnb_', 'median_comp'])
    ]

    if not comp_features:
        logger.warning("no_competition_features_to_correlate")
        return base_correlations

    # Compute correlations for competition features
    pearson_df = compute_pearson_correlation(competition_df, target, comp_features)
    spearman_df = compute_spearman_correlation(competition_df, target, comp_features)

    # Tag with category
    pearson_df['category'] = 'competition'
    spearman_df['category'] = 'competition'

    # Combine
    combined = pd.concat([
        base_correlations,
        pearson_df,
        spearman_df
    ], ignore_index=True)

    logger.info("competition_correlations_added", comp_features=len(comp_features))
    return combined
