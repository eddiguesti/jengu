"""Unit tests for pricing optimization"""
import pytest
from core.optimize.price_search import optimize_price_simple


def test_optimize_price_simple():
    """Test simple price optimization"""
    result = optimize_price_simple(
        base_price=1000.0,
        base_demand=10.0,
        elasticity=-1.5
    )

    assert 'optimal_price' in result
    assert 'expected_demand' in result
    assert 'expected_revenue' in result
    assert result['optimal_price'] > 0


def test_optimize_price_inelastic():
    """Test price optimization with inelastic demand"""
    result = optimize_price_simple(
        base_price=1000.0,
        base_demand=10.0,
        elasticity=-0.5  # Inelastic
    )

    # Should recommend no change for inelastic demand
    assert result['optimal_price'] == 1000.0


def test_optimize_price_negative():
    """Test that prices are never negative"""
    result = optimize_price_simple(
        base_price=100.0,
        base_demand=5.0,
        elasticity=-2.0
    )

    assert result['optimal_price'] > 0
    assert result['expected_demand'] >= 0
