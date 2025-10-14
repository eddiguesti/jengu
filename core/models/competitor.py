"""
Competitor Intelligence Data Models
Stores competitor catalog, daily pricing observations, and similarity scores
"""
from dataclasses import dataclass, field, asdict
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from pathlib import Path
import json
import pandas as pd


@dataclass
class Competitor:
    """
    Represents a competitor property (hotel or Airbnb market)
    """
    comp_id: str
    comp_type: str  # 'hotel' or 'airbnb_market'
    name: str
    region: str
    city: str
    lat: float
    lon: float
    stars: Optional[int] = None
    rating: Optional[float] = None
    amenities: List[str] = field(default_factory=list)
    size: Optional[int] = None  # number of rooms/units
    provider_ref: Dict[str, Any] = field(default_factory=dict)  # API-specific IDs
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Competitor':
        """Create from dictionary"""
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        return cls(**data)


@dataclass
class CompetitorObservation:
    """
    Daily price/occupancy observation for a competitor
    """
    date: date
    comp_id: str
    price: float
    currency: str = "EUR"
    occupancy: Optional[float] = None  # 0.0 to 1.0
    availability: Dict[str, Any] = field(default_factory=dict)
    source: str = ""  # 'makcorps', 'airbtics', 'airdna'
    confidence: float = 1.0  # 0.0 to 1.0
    observed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['date'] = self.date.isoformat()
        data['observed_at'] = self.observed_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CompetitorObservation':
        """Create from dictionary"""
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = date.fromisoformat(data['date'])
        if 'observed_at' in data and isinstance(data['observed_at'], str):
            data['observed_at'] = datetime.fromisoformat(data['observed_at'])
        return cls(**data)


@dataclass
class CompetitorSimilarity:
    """
    Computed similarity score between base property and competitor
    """
    base_property_id: str
    comp_id: str
    distance_km: float
    similarity_score: float  # 0.0 to 1.0
    rank: int
    computed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['computed_at'] = self.computed_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CompetitorSimilarity':
        """Create from dictionary"""
        if 'computed_at' in data and isinstance(data['computed_at'], str):
            data['computed_at'] = datetime.fromisoformat(data['computed_at'])
        return cls(**data)


class CompetitorRepository:
    """
    File-based repository for competitor data (matches existing pattern)
    """

    def __init__(self, data_dir: Path = None):
        """Initialize repository with data directory"""
        if data_dir is None:
            data_dir = Path(__file__).parent.parent.parent / "data" / "competitors"

        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.competitors_file = self.data_dir / "competitors.json"
        self.observations_file = self.data_dir / "observations.parquet"
        self.similarity_file = self.data_dir / "similarity.json"

    # ===== Competitor Catalog =====

    def save_competitor(self, competitor: Competitor) -> None:
        """Save or update a competitor"""
        competitors = self.load_all_competitors()

        # Update or add
        competitors[competitor.comp_id] = competitor.to_dict()

        with open(self.competitors_file, 'w') as f:
            json.dump(competitors, f, indent=2)

    def load_competitor(self, comp_id: str) -> Optional[Competitor]:
        """Load a single competitor by ID"""
        competitors = self.load_all_competitors()
        data = competitors.get(comp_id)
        return Competitor.from_dict(data) if data else None

    def load_all_competitors(self) -> Dict[str, Dict[str, Any]]:
        """Load all competitors as dictionary"""
        if not self.competitors_file.exists():
            return {}

        with open(self.competitors_file, 'r') as f:
            return json.load(f)

    def get_competitors_by_type(self, comp_type: str) -> List[Competitor]:
        """Get all competitors of a specific type"""
        all_comps = self.load_all_competitors()
        return [
            Competitor.from_dict(data)
            for data in all_comps.values()
            if data.get('comp_type') == comp_type
        ]

    def delete_competitor(self, comp_id: str) -> bool:
        """Delete a competitor"""
        competitors = self.load_all_competitors()
        if comp_id in competitors:
            del competitors[comp_id]
            with open(self.competitors_file, 'w') as f:
                json.dump(competitors, f, indent=2)
            return True
        return False

    # ===== Competitor Observations =====

    def save_observations(self, observations: List[CompetitorObservation]) -> None:
        """Save competitor observations (append to existing)"""
        # Convert to DataFrame
        new_df = pd.DataFrame([obs.to_dict() for obs in observations])
        new_df['date'] = pd.to_datetime(new_df['date'])

        # Load existing if present
        if self.observations_file.exists():
            existing_df = pd.read_parquet(self.observations_file)
            # Combine and deduplicate
            combined_df = pd.concat([existing_df, new_df], ignore_index=True)
            combined_df = combined_df.drop_duplicates(subset=['date', 'comp_id'], keep='last')
        else:
            combined_df = new_df

        # Save
        combined_df.to_parquet(self.observations_file, index=False)

    def load_observations(
        self,
        comp_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> pd.DataFrame:
        """Load observations with optional filters"""
        if not self.observations_file.exists():
            return pd.DataFrame()

        df = pd.read_parquet(self.observations_file)
        df['date'] = pd.to_datetime(df['date'])

        # Apply filters
        if comp_id:
            df = df[df['comp_id'] == comp_id]
        if start_date:
            df = df[df['date'] >= pd.Timestamp(start_date)]
        if end_date:
            df = df[df['date'] <= pd.Timestamp(end_date)]

        return df

    def get_latest_observation(self, comp_id: str) -> Optional[CompetitorObservation]:
        """Get most recent observation for a competitor"""
        df = self.load_observations(comp_id=comp_id)
        if df.empty:
            return None

        latest_row = df.sort_values('observed_at', ascending=False).iloc[0]
        return CompetitorObservation.from_dict(latest_row.to_dict())

    # ===== Similarity Scores =====

    def save_similarity_scores(
        self,
        base_property_id: str,
        similarities: List[CompetitorSimilarity]
    ) -> None:
        """Save similarity scores for a base property"""
        all_similarities = self.load_all_similarity_scores()

        # Update for this property
        all_similarities[base_property_id] = [
            sim.to_dict() for sim in similarities
        ]

        with open(self.similarity_file, 'w') as f:
            json.dump(all_similarities, f, indent=2)

    def load_similarity_scores(
        self,
        base_property_id: str,
        min_score: float = 0.0
    ) -> List[CompetitorSimilarity]:
        """Load similarity scores for a base property"""
        all_similarities = self.load_all_similarity_scores()

        if base_property_id not in all_similarities:
            return []

        similarities = [
            CompetitorSimilarity.from_dict(data)
            for data in all_similarities[base_property_id]
        ]

        # Filter by minimum score
        return [s for s in similarities if s.similarity_score >= min_score]

    def load_all_similarity_scores(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load all similarity scores"""
        if not self.similarity_file.exists():
            return {}

        with open(self.similarity_file, 'r') as f:
            return json.load(f)

    # ===== Utility Methods =====

    def get_statistics(self) -> Dict[str, Any]:
        """Get repository statistics"""
        competitors = self.load_all_competitors()

        stats = {
            "total_competitors": len(competitors),
            "hotels": sum(1 for c in competitors.values() if c.get('comp_type') == 'hotel'),
            "airbnb_markets": sum(1 for c in competitors.values() if c.get('comp_type') == 'airbnb_market'),
        }

        if self.observations_file.exists():
            df = pd.read_parquet(self.observations_file)
            stats["total_observations"] = len(df)
            stats["date_range"] = {
                "start": str(df['date'].min()),
                "end": str(df['date'].max())
            }
        else:
            stats["total_observations"] = 0
            stats["date_range"] = None

        return stats
