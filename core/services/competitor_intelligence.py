"""
Competitor Intelligence Service
Orchestrates competitor discovery, data fetching, similarity scoring, and correlation analysis
"""
import asyncio
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
from pathlib import Path

from core.models.competitor import (
    Competitor,
    CompetitorObservation,
    CompetitorSimilarity,
    CompetitorRepository
)
from core.connectors.makcorps import MakcorpsConnector, fetch_price_history_batch
from core.connectors.airbtics import AirbticsConnector, fetch_market_data_batch
from core.analysis.similarity import (
    SimilarityScorer,
    PropertyAttributes,
    filter_competitors_by_business_type
)
from core.models.business_profile import BusinessProfile
from core.utils.logging import get_logger

logger = get_logger(__name__)


class CompetitorIntelligenceService:
    """
    Main service for competitor intelligence operations
    """

    def __init__(
        self,
        repository: Optional[CompetitorRepository] = None,
        mock_mode: bool = False
    ):
        """
        Initialize service

        Args:
            repository: Competitor repository (creates default if None)
            mock_mode: Use mock API data
        """
        self.repository = repository or CompetitorRepository()
        self.mock_mode = mock_mode

        self.makcorps = MakcorpsConnector(mock_mode=mock_mode)
        self.airbtics = AirbticsConnector(mock_mode=mock_mode)
        self.scorer = SimilarityScorer()

    # ===== Competitor Discovery =====

    async def discover_hotel_competitors(
        self,
        profile: BusinessProfile,
        radius_km: float = 10,
        min_stars: int = 3,
        max_stars: int = 5
    ) -> List[Competitor]:
        """
        Discover hotel competitors near business location

        Args:
            profile: Business profile with location
            radius_km: Search radius
            min_stars: Minimum star rating
            max_stars: Maximum star rating

        Returns:
            List of Competitor objects
        """
        logger.info(
            "discovering_hotel_competitors",
            lat=profile.latitude,
            lon=profile.longitude,
            radius_km=radius_km
        )

        # Search via Makcorps
        hotels = await self.makcorps.search_hotels(
            lat=profile.latitude,
            lon=profile.longitude,
            radius_km=radius_km,
            min_stars=min_stars,
            max_stars=max_stars
        )

        # Convert to Competitor objects
        competitors = []
        for hotel in hotels:
            comp = Competitor(
                comp_id=f"hotel_{hotel['hotel_id']}",
                comp_type="hotel",
                name=hotel['name'],
                region=profile.city,
                city=profile.city,
                lat=hotel['lat'],
                lon=hotel['lon'],
                stars=hotel.get('stars'),
                rating=hotel.get('rating'),
                amenities=hotel.get('amenities', []),
                size=hotel.get('num_rooms'),
                provider_ref={"makcorps_hotel_id": hotel['hotel_id']}
            )
            competitors.append(comp)

            # Save to repository
            self.repository.save_competitor(comp)

        logger.info("hotel_competitors_discovered", count=len(competitors))
        return competitors

    async def discover_airbnb_markets(
        self,
        profile: BusinessProfile
    ) -> List[Competitor]:
        """
        Discover Airbnb market regions for business location

        Args:
            profile: Business profile with location

        Returns:
            List of Competitor objects representing markets
        """
        logger.info(
            "discovering_airbnb_markets",
            city=profile.city,
            country=profile.country
        )

        # Search via Airbtics
        markets = await self.airbtics.search_markets(
            city=profile.city,
            country=profile.country,
            lat=profile.latitude,
            lon=profile.longitude
        )

        # Convert to Competitor objects
        competitors = []
        for market in markets:
            comp = Competitor(
                comp_id=f"airbnb_{market['market_id']}",
                comp_type="airbnb_market",
                name=market['name'],
                region=market.get('region', profile.city),
                city=market['city'],
                lat=market['lat'],
                lon=market['lon'],
                size=market.get('num_listings'),
                provider_ref={
                    "airbtics_market_id": market['market_id'],
                    "market_type": market.get('market_type')
                }
            )
            competitors.append(comp)

            # Save to repository
            self.repository.save_competitor(comp)

        logger.info("airbnb_markets_discovered", count=len(competitors))
        return competitors

    # ===== Similarity Scoring =====

    def compute_similarity_scores(
        self,
        profile: BusinessProfile,
        min_similarity: float = 0.6,
        max_distance_km: float = 10.0,
        top_n: int = 10
    ) -> List[CompetitorSimilarity]:
        """
        Compute similarity scores between business and all competitors

        Args:
            profile: Business profile
            min_similarity: Minimum similarity threshold
            max_distance_km: Maximum distance threshold
            top_n: Number of top competitors to return

        Returns:
            List of CompetitorSimilarity objects
        """
        logger.info("computing_similarity_scores", property=profile.business_name)

        # Build base property attributes
        base_attrs = PropertyAttributes(
            lat=profile.latitude,
            lon=profile.longitude,
            stars=None,  # TODO: Add to BusinessProfile
            amenities=[],
            size=None
        )

        # Load all competitors
        all_competitors = self.repository.load_all_competitors()

        # Build candidate list
        candidates = []
        for comp_id, comp_data in all_competitors.items():
            comp_attrs = PropertyAttributes(
                lat=comp_data['lat'],
                lon=comp_data['lon'],
                stars=comp_data.get('stars'),
                amenities=comp_data.get('amenities', []),
                size=comp_data.get('size')
            )
            candidates.append((comp_id, comp_attrs))

        # Find similar
        results = self.scorer.find_similar_competitors(
            base_attrs,
            candidates,
            min_similarity=min_similarity,
            max_distance_km=max_distance_km,
            top_n=top_n
        )

        # Convert to CompetitorSimilarity objects
        similarities = [
            CompetitorSimilarity(
                base_property_id=profile.business_name,
                comp_id=result['comp_id'],
                distance_km=result['distance_km'],
                similarity_score=result['similarity_score'],
                rank=result['rank']
            )
            for result in results
        ]

        # Save to repository
        self.repository.save_similarity_scores(
            profile.business_name,
            similarities
        )

        logger.info("similarity_scores_computed", count=len(similarities))
        return similarities

    # ===== Data Fetching =====

    async def fetch_hotel_price_history(
        self,
        competitor_ids: List[str],
        start_date: date,
        end_date: date
    ) -> int:
        """
        Fetch historical prices for hotel competitors

        Args:
            competitor_ids: List of competitor IDs (format: "hotel_{makcorps_id}")
            start_date: Start date
            end_date: End date

        Returns:
            Number of observations saved
        """
        logger.info(
            "fetching_hotel_prices",
            count=len(competitor_ids),
            start_date=start_date,
            end_date=end_date
        )

        # Extract Makcorps hotel IDs
        hotel_ids = []
        for comp_id in competitor_ids:
            comp = self.repository.load_competitor(comp_id)
            if comp and comp.comp_type == "hotel":
                makcorps_id = comp.provider_ref.get("makcorps_hotel_id")
                if makcorps_id:
                    hotel_ids.append((comp_id, makcorps_id))

        # Fetch in batches
        makcorps_ids = [mid for _, mid in hotel_ids]
        price_data = await fetch_price_history_batch(
            makcorps_ids,
            start_date,
            end_date,
            mock_mode=self.mock_mode
        )

        # Convert to observations
        observations = []
        for comp_id, makcorps_id in hotel_ids:
            prices = price_data.get(makcorps_id, [])
            for price_record in prices:
                obs = CompetitorObservation(
                    date=datetime.fromisoformat(price_record['date']).date(),
                    comp_id=comp_id,
                    price=price_record['price'],
                    currency=price_record.get('currency', 'EUR'),
                    occupancy=price_record.get('occupancy'),
                    availability={"available_rooms": price_record.get('availability', 0)},
                    source="makcorps",
                    confidence=1.0 if not self.mock_mode else 0.5
                )
                observations.append(obs)

        # Save to repository
        if observations:
            self.repository.save_observations(observations)

        logger.info("hotel_prices_fetched", observations=len(observations))
        return len(observations)

    async def fetch_airbnb_market_data(
        self,
        competitor_ids: List[str],
        start_date: date,
        end_date: date
    ) -> int:
        """
        Fetch Airbnb market metrics

        Args:
            competitor_ids: List of competitor IDs (format: "airbnb_{market_id}")
            start_date: Start date
            end_date: End date

        Returns:
            Number of observations saved
        """
        logger.info(
            "fetching_airbnb_markets",
            count=len(competitor_ids),
            start_date=start_date,
            end_date=end_date
        )

        # Extract market IDs
        market_ids = []
        for comp_id in competitor_ids:
            comp = self.repository.load_competitor(comp_id)
            if comp and comp.comp_type == "airbnb_market":
                market_id = comp.provider_ref.get("airbtics_market_id")
                if market_id:
                    market_ids.append((comp_id, market_id))

        # Fetch in batches
        airbtics_ids = [mid for _, mid in market_ids]
        market_data = await fetch_market_data_batch(
            airbtics_ids,
            start_date,
            end_date,
            mock_mode=self.mock_mode
        )

        # Convert to observations (ADR as "price")
        observations = []
        for comp_id, market_id in market_ids:
            metrics = market_data.get(market_id, [])
            for metric_record in metrics:
                obs = CompetitorObservation(
                    date=datetime.fromisoformat(metric_record['date']).date(),
                    comp_id=comp_id,
                    price=metric_record['adr'],  # Average Daily Rate
                    currency="EUR",
                    occupancy=metric_record.get('occupancy'),
                    availability={
                        "available_listings": metric_record.get('available_listings'),
                        "booked_listings": metric_record.get('booked_listings')
                    },
                    source=self.airbtics.provider,
                    confidence=1.0 if not self.mock_mode else 0.5
                )
                observations.append(obs)

        # Save to repository
        if observations:
            self.repository.save_observations(observations)

        logger.info("airbnb_market_data_fetched", observations=len(observations))
        return len(observations)

    async def fetch_all_competitor_data(
        self,
        profile: BusinessProfile,
        start_date: date,
        end_date: date,
        min_similarity: float = 0.6
    ) -> Dict[str, int]:
        """
        Fetch data for all similar competitors

        Args:
            profile: Business profile
            start_date: Start date
            end_date: End date
            min_similarity: Minimum similarity score

        Returns:
            Dictionary with counts: {"hotels": N, "airbnb_markets": M}
        """
        # Get top similar competitors
        similarities = self.repository.load_similarity_scores(
            profile.business_name,
            min_score=min_similarity
        )

        if not similarities:
            logger.warning("no_similar_competitors_found")
            return {"hotels": 0, "airbnb_markets": 0}

        # Split by type
        hotel_ids = []
        airbnb_ids = []

        for sim in similarities:
            comp = self.repository.load_competitor(sim.comp_id)
            if comp:
                if comp.comp_type == "hotel":
                    hotel_ids.append(sim.comp_id)
                elif comp.comp_type == "airbnb_market":
                    airbnb_ids.append(sim.comp_id)

        # Fetch in parallel
        tasks = []
        if hotel_ids:
            tasks.append(self.fetch_hotel_price_history(hotel_ids, start_date, end_date))
        if airbnb_ids:
            tasks.append(self.fetch_airbnb_market_data(airbnb_ids, start_date, end_date))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        counts = {
            "hotels": results[0] if len(results) > 0 and not isinstance(results[0], Exception) else 0,
            "airbnb_markets": results[1] if len(results) > 1 and not isinstance(results[1], Exception) else 0
        }

        return counts

    # ===== Analysis =====

    def compute_competitive_gap(
        self,
        our_prices: pd.DataFrame,
        date_col: str = "date",
        price_col: str = "price"
    ) -> pd.DataFrame:
        """
        Compute competitive price gap

        comp_gap = our_price - median(competitor_prices)

        Args:
            our_prices: DataFrame with our pricing data
            date_col: Date column name
            price_col: Price column name

        Returns:
            DataFrame with competitive gap metrics
        """
        # Load all competitor observations
        comp_df = self.repository.load_observations()

        if comp_df.empty:
            logger.warning("no_competitor_data_for_gap_analysis")
            return pd.DataFrame()

        # Aggregate competitor prices by date (median)
        comp_agg = comp_df.groupby('date').agg({
            'price': ['median', 'mean', 'std', 'count']
        }).reset_index()

        comp_agg.columns = ['date', 'median_comp_price', 'mean_comp_price', 'std_comp_price', 'num_competitors']

        # Merge with our prices
        our_df = our_prices[[date_col, price_col]].copy()
        our_df[date_col] = pd.to_datetime(our_df[date_col])
        our_df = our_df.rename(columns={price_col: 'our_price'})

        merged = pd.merge(
            our_df,
            comp_agg,
            left_on=date_col,
            right_on='date',
            how='left'
        )

        # Compute gap
        merged['comp_gap'] = merged['our_price'] - merged['median_comp_price']

        # Z-score normalization
        merged['comp_gap_z'] = (
            (merged['comp_gap'] - merged['comp_gap'].mean())
            / merged['comp_gap'].std()
        )

        return merged

    def get_summary_statistics(self) -> Dict[str, Any]:
        """
        Get summary statistics for competitor intelligence

        Returns:
            Dictionary with stats
        """
        stats = self.repository.get_statistics()

        # Add similarity info
        all_similarities = self.repository.load_all_similarity_scores()
        stats['properties_with_similarity'] = len(all_similarities)

        return stats
