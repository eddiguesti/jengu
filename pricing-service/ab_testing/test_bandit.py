"""
Tests for Contextual Bandit
Task 18: RL Contextual Bandit Pilot
"""

import pytest
import numpy as np
from contextual_bandit import ContextualBandit, BanditContext, ThompsonSamplingBandit


def test_bandit_initialization():
    """Test bandit initialization"""
    bandit = ContextualBandit(
        property_id='test-property',
        epsilon=0.1,
        min_price=50.0,
        max_price=500.0
    )

    assert bandit.property_id == 'test-property'
    assert bandit.epsilon == 0.1
    assert len(bandit.arms) == 7  # 7 price deltas
    assert 'delta_+5' in bandit.arms
    assert 'delta_-10' in bandit.arms


def test_arm_selection():
    """Test arm selection with epsilon-greedy"""
    bandit = ContextualBandit(
        property_id='test-property',
        epsilon=0.1
    )

    context = BanditContext(
        property_id='test-property',
        stay_date='2025-11-01',
        quote_time='2025-10-25T10:00:00',
        occupancy_rate=0.6,
        lead_days=7,
        season='Fall',
        day_of_week=5,
        is_weekend=True,
        is_holiday=False,
        los=2,
        base_price=100.0
    )

    action = bandit.select_arm(context)

    assert action is not None
    assert action.arm_id in bandit.arms
    assert action.base_price == 100.0
    assert action.final_price >= 50.0
    assert action.final_price <= 500.0
    assert action.policy in ['explore', 'exploit']


def test_reward_update():
    """Test reward update and Q-value learning"""
    bandit = ContextualBandit(
        property_id='test-property',
        epsilon=0.1,
        learning_rate=0.1
    )

    # Initial Q-value is 0
    assert bandit.arms['delta_0'].q_value == 0.0

    # Update with reward
    bandit.update_reward('delta_0', True, 150.0)

    # Q-value should be updated
    assert bandit.arms['delta_0'].q_value > 0.0
    assert bandit.arms['delta_0'].successes == 1
    assert bandit.arms['delta_0'].failures == 0


def test_safety_bounds():
    """Test safety guardrails"""
    bandit = ContextualBandit(
        property_id='test-property',
        epsilon=0.0,  # No exploration, force exploitation
        min_price=80.0,
        max_price=200.0
    )

    context = BanditContext(
        property_id='test-property',
        stay_date='2025-11-01',
        quote_time='2025-10-25T10:00:00',
        occupancy_rate=0.6,
        lead_days=7,
        season='Fall',
        day_of_week=5,
        is_weekend=False,
        is_holiday=False,
        los=2,
        base_price=100.0
    )

    # Try to select -15% delta (would be $85, but min is $80)
    # Force selection by updating Q-values
    bandit.arms['delta_-15'].q_value = 100.0  # Make it best

    action = bandit.select_arm(context)

    # Should be clamped to bounds
    assert action.final_price >= 80.0
    assert action.final_price <= 200.0


def test_conservative_mode():
    """Test conservative mode during high demand"""
    bandit = ContextualBandit(
        property_id='test-property',
        epsilon=0.2,
        conservative_mode=True
    )

    # High occupancy + holiday
    context = BanditContext(
        property_id='test-property',
        stay_date='2025-12-25',
        quote_time='2025-12-20T10:00:00',
        occupancy_rate=0.95,
        lead_days=5,
        season='Winter',
        day_of_week=3,
        is_weekend=False,
        is_holiday=True,
        los=3,
        base_price=200.0
    )

    # Run multiple selections and check exploration is reduced
    explore_count = 0
    for _ in range(100):
        action = bandit.select_arm(context)
        if action.policy == 'explore':
            explore_count += 1

    # Exploration should be less than 20% (epsilon=0.2 but halved in conservative mode)
    assert explore_count < 20


def test_thompson_sampling():
    """Test Thompson Sampling bandit"""
    bandit = ThompsonSamplingBandit(
        property_id='test-property'
    )

    context = BanditContext(
        property_id='test-property',
        stay_date='2025-11-01',
        quote_time='2025-10-25T10:00:00',
        occupancy_rate=0.6,
        lead_days=7,
        season='Fall',
        day_of_week=5,
        is_weekend=False,
        is_holiday=False,
        los=2,
        base_price=100.0
    )

    action = bandit.select_arm(context)

    assert action is not None
    assert action.policy == 'thompson_sampling'

    # Update with outcome
    bandit.update_reward(action.arm_id, True, 150.0)

    assert bandit.arms[action.arm_id].successes > 0


def test_feature_vector_normalization():
    """Test context feature vector"""
    context = BanditContext(
        property_id='test-property',
        stay_date='2025-11-01',
        quote_time='2025-10-25T10:00:00',
        occupancy_rate=0.75,
        lead_days=30,
        season='Summer',
        day_of_week=6,
        is_weekend=True,
        is_holiday=False,
        los=7,
        competitor_p50=120.0,
        base_price=100.0
    )

    features = context.to_feature_vector()

    # All features should be in 0-1 range (approximately)
    assert all(f >= 0.0 and f <= 1.5 for f in features)  # Some features like competitor ratio can be > 1
    assert len(features) == 8  # 8 features


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
