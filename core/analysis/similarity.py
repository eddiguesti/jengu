"""
Competitor Similarity Scoring Algorithm
Mathematical similarity between properties based on location, stars, amenities, size
"""
import math
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
from dataclasses import dataclass


@dataclass
class PropertyAttributes:
    """Property attributes for similarity comparison"""
    lat: float
    lon: float
    stars: Optional[int] = None
    rating: Optional[float] = None
    amenities: List[str] = None
    size: Optional[int] = None  # number of rooms/units

    def __post_init__(self):
        if self.amenities is None:
            self.amenities = []


class SimilarityScorer:
    """
    Compute similarity scores between properties

    Formula:
        S = α_loc * w_loc + α_star * w_star + α_amen * w_amen + α_size * w_size

    Where:
        - w_loc: Geographical proximity weight (Gaussian decay)
        - w_star: Star/rating similarity weight
        - w_amen: Amenity overlap (Jaccard index)
        - w_size: Size similarity weight (log-scale)

    Default weights: α = [0.4, 0.3, 0.2, 0.1]
    """

    def __init__(
        self,
        alpha_loc: float = 0.4,
        alpha_star: float = 0.3,
        alpha_amen: float = 0.2,
        alpha_size: float = 0.1,
        sigma_loc: float = 2.0,
        sigma_star: float = 1.0,
        sigma_size: float = 0.5
    ):
        """
        Initialize similarity scorer

        Args:
            alpha_loc: Weight for location similarity
            alpha_star: Weight for star/rating similarity
            alpha_amen: Weight for amenity overlap
            alpha_size: Weight for size similarity
            sigma_loc: Location decay parameter (km)
            sigma_star: Star rating decay parameter
            sigma_size: Size decay parameter (log scale)
        """
        self.alpha_loc = alpha_loc
        self.alpha_star = alpha_star
        self.alpha_amen = alpha_amen
        self.alpha_size = alpha_size

        self.sigma_loc = sigma_loc
        self.sigma_star = sigma_star
        self.sigma_size = sigma_size

        # Normalize alphas
        total = self.alpha_loc + self.alpha_star + self.alpha_amen + self.alpha_size
        self.alpha_loc /= total
        self.alpha_star /= total
        self.alpha_amen /= total
        self.alpha_size /= total

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate great-circle distance between two points (Haversine formula)

        Args:
            lat1, lon1: Coordinates of point 1 (degrees)
            lat2, lon2: Coordinates of point 2 (degrees)

        Returns:
            Distance in kilometers
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        lon1_rad = math.radians(lon1)
        lon2_rad = math.radians(lon2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))

        # Radius of Earth in km
        R = 6371

        return R * c

    def compute_location_weight(self, distance_km: float) -> float:
        """
        Compute location similarity weight using Gaussian decay

        w_loc = exp(-(d_km / σ_loc)^2)

        Args:
            distance_km: Distance in kilometers

        Returns:
            Weight between 0 and 1
        """
        return math.exp(-((distance_km / self.sigma_loc) ** 2))

    def compute_star_weight(self, stars_a: Optional[int], stars_b: Optional[int]) -> float:
        """
        Compute star/rating similarity weight

        w_star = exp(-((Δstars) / σ_star)^2)

        Args:
            stars_a: Stars for property A
            stars_b: Stars for property B

        Returns:
            Weight between 0 and 1
        """
        if stars_a is None or stars_b is None:
            return 0.5  # Neutral weight if missing

        delta_stars = abs(stars_a - stars_b)
        return math.exp(-((delta_stars / self.sigma_star) ** 2))

    def compute_amenity_weight(
        self,
        amenities_a: List[str],
        amenities_b: List[str]
    ) -> float:
        """
        Compute amenity overlap using Jaccard index

        w_amen = |A ∩ B| / |A ∪ B|

        Args:
            amenities_a: List of amenities for property A
            amenities_b: List of amenities for property B

        Returns:
            Weight between 0 and 1
        """
        if not amenities_a or not amenities_b:
            return 0.0

        set_a = set(amenities_a)
        set_b = set(amenities_b)

        intersection = len(set_a & set_b)
        union = len(set_a | set_b)

        if union == 0:
            return 0.0

        return intersection / union

    def compute_size_weight(self, size_a: Optional[int], size_b: Optional[int]) -> float:
        """
        Compute size similarity weight using log scale

        w_size = exp(-(|log(size_A) - log(size_B)| / σ_size)^2)

        Args:
            size_a: Size for property A
            size_b: Size for property B

        Returns:
            Weight between 0 and 1
        """
        if size_a is None or size_b is None or size_a <= 0 or size_b <= 0:
            return 0.5  # Neutral weight if missing

        log_a = math.log(size_a)
        log_b = math.log(size_b)

        delta_log = abs(log_a - log_b)
        return math.exp(-((delta_log / self.sigma_size) ** 2))

    def compute_similarity(
        self,
        property_a: PropertyAttributes,
        property_b: PropertyAttributes
    ) -> Tuple[float, float, Dict[str, float]]:
        """
        Compute overall similarity score

        Returns:
            (similarity_score, distance_km, component_weights)
        """
        # 1. Geographical distance
        distance_km = self.haversine_distance(
            property_a.lat, property_a.lon,
            property_b.lat, property_b.lon
        )
        w_loc = self.compute_location_weight(distance_km)

        # 2. Star similarity
        w_star = self.compute_star_weight(property_a.stars, property_b.stars)

        # 3. Amenity overlap
        w_amen = self.compute_amenity_weight(property_a.amenities, property_b.amenities)

        # 4. Size similarity
        w_size = self.compute_size_weight(property_a.size, property_b.size)

        # Composite score
        similarity = (
            self.alpha_loc * w_loc
            + self.alpha_star * w_star
            + self.alpha_amen * w_amen
            + self.alpha_size * w_size
        )

        components = {
            "location": w_loc,
            "stars": w_star,
            "amenities": w_amen,
            "size": w_size
        }

        return similarity, distance_km, components

    def find_similar_competitors(
        self,
        base_property: PropertyAttributes,
        candidates: List[Tuple[str, PropertyAttributes]],
        min_similarity: float = 0.6,
        max_distance_km: float = 10.0,
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find top N similar competitors to base property

        Args:
            base_property: The property to compare against
            candidates: List of (comp_id, attributes) tuples
            min_similarity: Minimum similarity threshold
            max_distance_km: Maximum distance threshold
            top_n: Number of top matches to return

        Returns:
            List of dictionaries with comp_id, similarity, distance, components
        """
        results = []

        for comp_id, comp_attrs in candidates:
            similarity, distance_km, components = self.compute_similarity(
                base_property,
                comp_attrs
            )

            # Apply filters
            if similarity >= min_similarity and distance_km <= max_distance_km:
                results.append({
                    "comp_id": comp_id,
                    "similarity_score": round(similarity, 4),
                    "distance_km": round(distance_km, 2),
                    "components": {k: round(v, 3) for k, v in components.items()}
                })

        # Sort by similarity (descending), then distance (ascending)
        results.sort(key=lambda x: (-x["similarity_score"], x["distance_km"]))

        # Assign ranks
        for i, result in enumerate(results[:top_n], 1):
            result["rank"] = i

        return results[:top_n]


# ===== Convenience Functions =====

def compute_similarity_matrix(
    properties: Dict[str, PropertyAttributes]
) -> np.ndarray:
    """
    Compute full similarity matrix for all properties

    Args:
        properties: Dictionary mapping property_id to attributes

    Returns:
        NxN numpy array of similarity scores
    """
    scorer = SimilarityScorer()

    prop_ids = list(properties.keys())
    n = len(prop_ids)

    matrix = np.zeros((n, n))

    for i, id_a in enumerate(prop_ids):
        for j, id_b in enumerate(prop_ids):
            if i == j:
                matrix[i, j] = 1.0
            elif i < j:
                similarity, _, _ = scorer.compute_similarity(
                    properties[id_a],
                    properties[id_b]
                )
                matrix[i, j] = similarity
                matrix[j, i] = similarity

    return matrix


def filter_competitors_by_business_type(
    base_stars: Optional[int],
    candidates: List[Tuple[str, PropertyAttributes]],
    comp_type: str = "hotel"
) -> List[Tuple[str, PropertyAttributes]]:
    """
    Filter competitors based on business type rules

    Rules:
        - Hotels: If base is 4★, keep only 3★-5★ competitors
        - Airbnb markets: Same city/region (handled by distance filter)

    Args:
        base_stars: Star rating of base property
        candidates: List of (comp_id, attributes) tuples
        comp_type: 'hotel' or 'airbnb_market'

    Returns:
        Filtered list of candidates
    """
    if comp_type != "hotel" or base_stars is None:
        return candidates

    # Define acceptable star range
    if base_stars == 5:
        acceptable_stars = {4, 5}
    elif base_stars == 4:
        acceptable_stars = {3, 4, 5}
    elif base_stars == 3:
        acceptable_stars = {2, 3, 4}
    else:
        acceptable_stars = {base_stars - 1, base_stars, base_stars + 1}

    # Filter
    filtered = [
        (comp_id, attrs)
        for comp_id, attrs in candidates
        if attrs.stars is None or attrs.stars in acceptable_stars
    ]

    return filtered
