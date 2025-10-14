"""Business profile models and management"""
from dataclasses import dataclass, asdict
from typing import Optional
from pathlib import Path
import json
from datetime import datetime

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class BusinessProfile:
    """Business profile with location and timezone info"""
    business_name: str
    business_type: str  # Hotel, Resort, Campsite, Hostel, Apartment, Other
    country: str  # ISO-2 code
    city: str
    latitude: float
    longitude: float
    timezone: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Enhanced fields
    currency: str = "EUR"
    operating_months: Optional[list] = None  # List of month numbers 1-12
    seasonal_pattern: str = "Year-Round"
    min_price: Optional[float] = None
    max_price: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> 'BusinessProfile':
        """Create from dictionary"""
        return cls(**data)

    def save(self, path: Path) -> None:
        """Save profile to JSON file"""
        path.parent.mkdir(parents=True, exist_ok=True)

        data = self.to_dict()
        data['updated_at'] = datetime.utcnow().isoformat()

        if not data.get('created_at'):
            data['created_at'] = data['updated_at']

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.info("business_profile_saved", path=str(path), business=self.business_name)

    @classmethod
    def load(cls, path: Path) -> Optional['BusinessProfile']:
        """Load profile from JSON file"""
        if not path.exists():
            logger.info("business_profile_not_found", path=str(path))
            return None

        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            profile = cls.from_dict(data)
            logger.info("business_profile_loaded", business=profile.business_name)
            return profile

        except Exception as e:
            logger.error("business_profile_load_failed", path=str(path), error=str(e))
            return None


class BusinessProfileManager:
    """Manager for business profile operations"""

    DEFAULT_PATH = Path("data/config/business_profile.json")

    def __init__(self, path: Optional[Path] = None):
        self.path = path or self.DEFAULT_PATH
        self.profile: Optional[BusinessProfile] = None

    def exists(self) -> bool:
        """Check if profile exists"""
        return self.path.exists()

    def load(self) -> Optional[BusinessProfile]:
        """Load existing profile"""
        self.profile = BusinessProfile.load(self.path)
        return self.profile

    def save(self, profile: BusinessProfile) -> None:
        """Save profile"""
        profile.save(self.path)
        self.profile = profile

    def get_or_create(self) -> Optional[BusinessProfile]:
        """Get existing profile or return None if needs setup"""
        if self.exists():
            return self.load()
        return None

    def update(self, **kwargs) -> None:
        """Update profile fields"""
        if not self.profile:
            raise ValueError("No profile loaded. Load or create one first.")

        for key, value in kwargs.items():
            if hasattr(self.profile, key):
                setattr(self.profile, key, value)

        self.save(self.profile)


# Business type options
BUSINESS_TYPES = [
    "Hotel",
    "Resort",
    "Campsite",
    "Hostel",
    "Apartment",
    "Vacation Rental",
    "Bed & Breakfast",
    "Other"
]

# Common country codes for dropdown
COMMON_COUNTRIES = {
    "FR": "France",
    "US": "United States",
    "GB": "United Kingdom",
    "ES": "Spain",
    "IT": "Italy",
    "DE": "Germany",
    "PT": "Portugal",
    "NL": "Netherlands",
    "BE": "Belgium",
    "CH": "Switzerland",
    "AT": "Austria",
    "AU": "Australia",
    "CA": "Canada",
    "JP": "Japan",
    "AE": "UAE",
}
