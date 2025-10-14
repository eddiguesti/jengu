"""Unit tests for pricing policies"""
import pytest
from core.policies.policy import PricingPolicy, SeasonalAdjustment


def test_create_policy():
    """Test creating a pricing policy"""
    policy = PricingPolicy(
        policy_name="test_policy",
        version="1.0",
        min_price_multiplier=0.5,
        max_price_multiplier=2.0
    )

    assert policy.policy_name == "test_policy"
    assert policy.version == "1.0"
    assert policy.min_price_multiplier == 0.5


def test_seasonal_adjustment():
    """Test seasonal price adjustment"""
    policy = PricingPolicy(
        policy_name="test",
        version="1.0",
        seasonal_adjustments=[
            SeasonalAdjustment(season="Peak", multiplier=1.5)
        ]
    )

    adjusted = policy.apply_seasonal_adjustment(1000.0, "Peak")
    assert adjusted == 1500.0


def test_global_constraints():
    """Test global price constraints"""
    policy = PricingPolicy(
        policy_name="test",
        version="1.0",
        min_price_multiplier=0.5,
        max_price_multiplier=2.0
    )

    # Test below minimum
    constrained = policy.apply_global_constraints(400.0, 1000.0)
    assert constrained == 500.0  # 1000 * 0.5

    # Test above maximum
    constrained = policy.apply_global_constraints(2500.0, 1000.0)
    assert constrained == 2000.0  # 1000 * 2.0


def test_apply_full_policy():
    """Test applying complete policy"""
    policy = PricingPolicy(
        policy_name="test",
        version="1.0",
        min_price_multiplier=0.7,
        max_price_multiplier=2.0,
        seasonal_adjustments=[
            SeasonalAdjustment(season="High", multiplier=1.3)
        ]
    )

    result = policy.apply_policy(
        base_price=1000.0,
        destination="Paris",
        season="High"
    )

    assert result['base_price'] == 1000.0
    assert result['final_price'] == 1300.0  # 1000 * 1.3
    assert 'Seasonal (High)' in result['adjustments']
