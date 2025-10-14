"""Versioned pricing policy with rule overlays"""
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import json
from pathlib import Path

from ..utils.logging import get_logger
from ..utils.config import get_settings

logger = get_logger(__name__)


class SeasonalAdjustment(BaseModel):
    """Seasonal pricing adjustment"""
    season: str
    multiplier: float = Field(ge=0.1, le=5.0)


class DestinationRule(BaseModel):
    """Destination-specific pricing rule"""
    destination: str
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    preferred_margin: Optional[float] = None


class PricingPolicy(BaseModel):
    """Versioned pricing policy configuration"""

    policy_name: str
    version: str
    is_active: bool = False

    # Global constraints
    min_price_multiplier: float = Field(default=0.5, ge=0.1, le=1.0)
    max_price_multiplier: float = Field(default=3.0, ge=1.0, le=10.0)

    # Seasonal adjustments
    seasonal_adjustments: List[SeasonalAdjustment] = Field(default_factory=list)

    # Destination-specific rules
    destination_rules: List[DestinationRule] = Field(default_factory=list)

    # Custom rules (flexible JSON)
    custom_rules: Dict[str, Any] = Field(default_factory=dict)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    description: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "policy_name": "summer_2024",
                "version": "1.0",
                "min_price_multiplier": 0.7,
                "max_price_multiplier": 2.5,
                "seasonal_adjustments": [
                    {"season": "Peak", "multiplier": 1.5},
                    {"season": "High", "multiplier": 1.2}
                ],
                "destination_rules": [
                    {"destination": "Paris", "min_price": 100, "max_price": 1000}
                ]
            }
        }

    def apply_seasonal_adjustment(self, base_price: float, season: str) -> float:
        """
        Apply seasonal adjustment to base price

        Args:
            base_price: Base price
            season: Season name

        Returns:
            Adjusted price
        """
        for adjustment in self.seasonal_adjustments:
            if adjustment.season == season:
                adjusted = base_price * adjustment.multiplier
                logger.info(
                    "seasonal_adjustment_applied",
                    season=season,
                    multiplier=adjustment.multiplier,
                    base_price=base_price,
                    adjusted_price=adjusted
                )
                return adjusted

        # No adjustment found, return base price
        return base_price

    def apply_destination_constraints(
        self,
        price: float,
        destination: str
    ) -> float:
        """
        Apply destination-specific constraints

        Args:
            price: Proposed price
            destination: Destination name

        Returns:
            Constrained price
        """
        for rule in self.destination_rules:
            if rule.destination == destination:
                if rule.min_price and price < rule.min_price:
                    logger.info(
                        "price_constrained_min",
                        destination=destination,
                        original_price=price,
                        min_price=rule.min_price
                    )
                    price = rule.min_price

                if rule.max_price and price > rule.max_price:
                    logger.info(
                        "price_constrained_max",
                        destination=destination,
                        original_price=price,
                        max_price=rule.max_price
                    )
                    price = rule.max_price

        return price

    def apply_global_constraints(self, price: float, base_price: float) -> float:
        """
        Apply global price multiplier constraints

        Args:
            price: Proposed price
            base_price: Original base price

        Returns:
            Constrained price
        """
        min_allowed = base_price * self.min_price_multiplier
        max_allowed = base_price * self.max_price_multiplier

        if price < min_allowed:
            logger.info("price_below_min_multiplier", price=price, min_allowed=min_allowed)
            return min_allowed

        if price > max_allowed:
            logger.info("price_above_max_multiplier", price=price, max_allowed=max_allowed)
            return max_allowed

        return price

    def apply_policy(
        self,
        base_price: float,
        destination: str,
        season: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Apply full policy to get final price

        Args:
            base_price: Base price before adjustments
            destination: Destination
            season: Season
            **kwargs: Additional context

        Returns:
            Dictionary with final_price and adjustments applied
        """
        adjustments = []
        current_price = base_price

        # 1. Apply seasonal adjustment
        adjusted_price = self.apply_seasonal_adjustment(current_price, season)
        if adjusted_price != current_price:
            adjustments.append(f"Seasonal ({season})")
            current_price = adjusted_price

        # 2. Apply destination constraints
        constrained_price = self.apply_destination_constraints(current_price, destination)
        if constrained_price != current_price:
            adjustments.append(f"Destination ({destination})")
            current_price = constrained_price

        # 3. Apply global constraints
        final_price = self.apply_global_constraints(current_price, base_price)
        if final_price != current_price:
            adjustments.append("Global constraints")

        return {
            'base_price': base_price,
            'final_price': final_price,
            'adjustments': adjustments,
            'policy_version': self.version
        }

    def save(self, filepath: Path):
        """Save policy to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(self.model_dump(), f, indent=2, default=str)
        logger.info("policy_saved", filepath=str(filepath), version=self.version)

    @classmethod
    def load(cls, filepath: Path) -> 'PricingPolicy':
        """Load policy from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        policy = cls(**data)
        logger.info("policy_loaded", filepath=str(filepath), version=policy.version)
        return policy


class PolicyManager:
    """Manage multiple pricing policies"""

    def __init__(self, storage_path: Optional[Path] = None):
        """
        Initialize policy manager

        Args:
            storage_path: Directory to store policies
        """
        settings = get_settings()
        self.storage_path = storage_path or (settings.model_artifacts_path / "policies")
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.policies: Dict[str, PricingPolicy] = {}
        self.active_policy: Optional[PricingPolicy] = None

    def add_policy(self, policy: PricingPolicy):
        """Add policy to manager"""
        self.policies[policy.version] = policy
        logger.info("policy_added", version=policy.version)

        if policy.is_active:
            self.set_active_policy(policy.version)

    def get_policy(self, version: str) -> Optional[PricingPolicy]:
        """Get policy by version"""
        return self.policies.get(version)

    def set_active_policy(self, version: str):
        """Set active policy version"""
        if version not in self.policies:
            raise ValueError(f"Policy version '{version}' not found")

        # Deactivate all policies
        for policy in self.policies.values():
            policy.is_active = False

        # Activate specified version
        self.policies[version].is_active = True
        self.active_policy = self.policies[version]
        logger.info("active_policy_set", version=version)

    def get_active_policy(self) -> Optional[PricingPolicy]:
        """Get currently active policy"""
        return self.active_policy

    def list_policies(self) -> List[str]:
        """Get list of all policy versions"""
        return list(self.policies.keys())

    def save_all(self):
        """Save all policies to storage"""
        for version, policy in self.policies.items():
            filepath = self.storage_path / f"policy_{version}.json"
            policy.save(filepath)

    def load_all(self):
        """Load all policies from storage"""
        policy_files = self.storage_path.glob("policy_*.json")

        for filepath in policy_files:
            policy = PricingPolicy.load(filepath)
            self.add_policy(policy)

        logger.info("policies_loaded", count=len(self.policies))


# Global policy manager instance
_policy_manager: Optional[PolicyManager] = None


def get_policy_manager() -> PolicyManager:
    """Get or create global policy manager"""
    global _policy_manager
    if _policy_manager is None:
        _policy_manager = PolicyManager()
    return _policy_manager
