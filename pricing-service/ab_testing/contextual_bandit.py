"""
Contextual Bandit for Autonomous Pricing Optimization
======================================================
Implements epsilon-greedy and Thompson Sampling policies for dynamic pricing.

Task 18: RL Contextual Bandit Pilot

Key Features:
- Multi-armed bandit with price deltas as arms
- Contextual features (occupancy, lead time, season, etc.)
- Epsilon-greedy exploration (default ε=0.1)
- Thompson Sampling with Beta priors
- Safety guardrails (price bounds, event clamps)
- Reward tracking and Q-value updates
"""

import numpy as np
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import json

logger = logging.getLogger(__name__)


@dataclass
class BanditArm:
    """Represents a pricing strategy arm"""
    arm_id: str
    delta_pct: float  # Price adjustment percentage (-15 to +15)
    pulls: int = 0  # Number of times selected
    total_reward: float = 0.0  # Cumulative reward
    successes: int = 0  # For Thompson Sampling (bookings)
    failures: int = 0  # For Thompson Sampling (no booking)
    q_value: float = 0.0  # Expected reward

    def update_q_value(self) -> None:
        """Update Q-value based on rewards"""
        if self.pulls > 0:
            self.q_value = self.total_reward / self.pulls
        else:
            self.q_value = 0.0


@dataclass
class BanditContext:
    """Context features for bandit decision"""
    property_id: str
    stay_date: str
    quote_time: str
    occupancy_rate: float
    lead_days: int
    season: str
    day_of_week: int
    is_weekend: bool
    is_holiday: bool
    los: int  # length of stay
    competitor_p50: Optional[float] = None
    base_price: float = 100.0

    def to_feature_vector(self) -> np.ndarray:
        """Convert context to normalized feature vector"""
        features = [
            self.occupancy_rate,  # 0-1
            min(self.lead_days / 90.0, 1.0),  # Normalize to 0-1
            1.0 if self.season == 'Summer' else 0.5 if self.season == 'Spring' else 0.0,
            self.day_of_week / 6.0,  # 0-1
            1.0 if self.is_weekend else 0.0,
            1.0 if self.is_holiday else 0.0,
            min(self.los / 14.0, 1.0),  # Normalize to 0-1
            self.competitor_p50 / self.base_price if self.competitor_p50 else 1.0,
        ]
        return np.array(features)


@dataclass
class BanditAction:
    """Action taken by the bandit"""
    arm_id: str
    delta_pct: float
    base_price: float
    final_price: float
    policy: str  # 'exploit' or 'explore'
    timestamp: str
    context: Dict[str, Any]


@dataclass
class BanditReward:
    """Reward feedback from outcome"""
    arm_id: str
    reward: float  # booking_count * ADR
    booking_made: bool
    actual_revenue: float
    timestamp: str


class ContextualBandit:
    """
    Contextual bandit for pricing optimization using epsilon-greedy policy.

    Arms: Price deltas from base ML price (-15%, -10%, -5%, 0%, +5%, +10%, +15%)
    Reward: bookings × ADR (Average Daily Rate)
    Policy: Epsilon-greedy with safety guardrails
    """

    def __init__(
        self,
        property_id: str,
        epsilon: float = 0.1,
        learning_rate: float = 0.1,
        discount_factor: float = 0.99,
        min_price: float = 50.0,
        max_price: float = 500.0,
        conservative_mode: bool = False
    ):
        """
        Initialize contextual bandit

        Args:
            property_id: Property identifier
            epsilon: Exploration rate (0.0 to 1.0)
            learning_rate: Q-value update rate
            discount_factor: Reward decay factor
            min_price: Minimum allowed price
            max_price: Maximum allowed price
            conservative_mode: If True, limits exploration during events
        """
        self.property_id = property_id
        self.epsilon = epsilon
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.min_price = min_price
        self.max_price = max_price
        self.conservative_mode = conservative_mode

        # Initialize arms with price deltas
        self.arms: Dict[str, BanditArm] = {}
        deltas = [-15, -10, -5, 0, 5, 10, 15]
        for delta in deltas:
            arm_id = f"delta_{delta:+d}"
            self.arms[arm_id] = BanditArm(
                arm_id=arm_id,
                delta_pct=delta
            )

        # Action and reward history
        self.action_history: List[BanditAction] = []
        self.reward_history: List[BanditReward] = []

        # Metrics
        self.total_pulls = 0
        self.total_reward = 0.0
        self.exploration_count = 0
        self.exploitation_count = 0

        logger.info(
            f"🎰 Initialized ContextualBandit for property {property_id}: "
            f"ε={epsilon}, arms={len(self.arms)}, bounds=[{min_price}, {max_price}]"
        )

    def select_arm(self, context: BanditContext) -> BanditAction:
        """
        Select pricing arm using epsilon-greedy policy

        Args:
            context: Current context features

        Returns:
            BanditAction with chosen arm and price
        """
        # Safety check: conservative mode during holidays/events
        effective_epsilon = self.epsilon
        if self.conservative_mode and (context.is_holiday or context.occupancy_rate > 0.9):
            effective_epsilon = self.epsilon / 2  # Reduce exploration
            logger.info("🛡️ Conservative mode: Reduced exploration during high-demand period")

        # Epsilon-greedy selection
        if np.random.random() < effective_epsilon:
            # Explore: Random arm
            arm_id = np.random.choice(list(self.arms.keys()))
            policy = 'explore'
            self.exploration_count += 1
        else:
            # Exploit: Best arm by Q-value
            arm_id = max(self.arms.keys(), key=lambda k: self.arms[k].q_value)
            policy = 'exploit'
            self.exploitation_count += 1

        arm = self.arms[arm_id]

        # Calculate final price
        adjusted_price = context.base_price * (1 + arm.delta_pct / 100.0)

        # Apply safety bounds
        final_price = self._apply_safety_bounds(adjusted_price, context)

        # Create action
        action = BanditAction(
            arm_id=arm_id,
            delta_pct=arm.delta_pct,
            base_price=context.base_price,
            final_price=final_price,
            policy=policy,
            timestamp=datetime.now().isoformat(),
            context=asdict(context)
        )

        # Update arm pull count
        arm.pulls += 1
        self.total_pulls += 1

        # Log action
        self.action_history.append(action)

        logger.info(
            f"🎯 Selected arm '{arm_id}' ({policy}): "
            f"${context.base_price:.2f} → ${final_price:.2f} ({arm.delta_pct:+.0f}%)"
        )

        return action

    def update_reward(
        self,
        arm_id: str,
        booking_made: bool,
        actual_revenue: float,
        context: Optional[BanditContext] = None
    ) -> None:
        """
        Update arm with reward feedback

        Args:
            arm_id: Arm that was selected
            booking_made: Whether a booking occurred
            actual_revenue: Revenue generated (ADR if booked, 0 otherwise)
            context: Optional context for contextual updates
        """
        if arm_id not in self.arms:
            logger.warning(f"⚠️ Unknown arm: {arm_id}")
            return

        arm = self.arms[arm_id]

        # Calculate reward: revenue or 0
        reward = actual_revenue if booking_made else 0.0

        # Update arm statistics
        arm.total_reward += reward
        if booking_made:
            arm.successes += 1
        else:
            arm.failures += 1

        # Update Q-value using exponential moving average
        if arm.pulls > 0:
            # Q(a) = Q(a) + α * (R - Q(a))
            arm.q_value = arm.q_value + self.learning_rate * (reward - arm.q_value)
        else:
            arm.q_value = reward

        # Update global metrics
        self.total_reward += reward

        # Log reward
        reward_record = BanditReward(
            arm_id=arm_id,
            reward=reward,
            booking_made=booking_made,
            actual_revenue=actual_revenue,
            timestamp=datetime.now().isoformat()
        )
        self.reward_history.append(reward_record)

        logger.info(
            f"💰 Reward for '{arm_id}': ${reward:.2f} (booking={booking_made}, "
            f"Q={arm.q_value:.2f}, pulls={arm.pulls})"
        )

    def _apply_safety_bounds(self, price: float, context: BanditContext) -> float:
        """
        Apply safety guardrails to price

        Args:
            price: Proposed price
            context: Pricing context

        Returns:
            Safe price within bounds
        """
        # Hard bounds
        safe_price = max(self.min_price, min(self.max_price, price))

        # Conservative clamp during high-demand events
        if self.conservative_mode and (context.is_holiday or context.occupancy_rate > 0.9):
            # Don't go below 80% of base price during high demand
            min_safe = context.base_price * 0.8
            safe_price = max(min_safe, safe_price)
            if safe_price != price:
                logger.info(f"🛡️ Safety clamp: ${price:.2f} → ${safe_price:.2f}")

        # Competitor-based bounds (if available)
        if context.competitor_p50:
            # Don't price more than 150% of competitor median
            max_competitive = context.competitor_p50 * 1.5
            if safe_price > max_competitive:
                safe_price = max_competitive
                logger.info(f"🛡️ Competitive clamp: capped at ${safe_price:.2f}")

        return safe_price

    def get_best_arm(self) -> Tuple[str, BanditArm]:
        """Get current best arm by Q-value"""
        best_arm_id = max(self.arms.keys(), key=lambda k: self.arms[k].q_value)
        return best_arm_id, self.arms[best_arm_id]

    def get_arm_statistics(self) -> Dict[str, Any]:
        """Get statistics for all arms"""
        stats = {
            'property_id': self.property_id,
            'total_pulls': self.total_pulls,
            'total_reward': self.total_reward,
            'avg_reward': self.total_reward / self.total_pulls if self.total_pulls > 0 else 0.0,
            'exploration_rate': self.exploration_count / self.total_pulls if self.total_pulls > 0 else 0.0,
            'arms': {}
        }

        for arm_id, arm in self.arms.items():
            stats['arms'][arm_id] = {
                'delta_pct': arm.delta_pct,
                'pulls': arm.pulls,
                'q_value': arm.q_value,
                'total_reward': arm.total_reward,
                'avg_reward': arm.total_reward / arm.pulls if arm.pulls > 0 else 0.0,
                'success_rate': arm.successes / arm.pulls if arm.pulls > 0 else 0.0,
            }

        return stats

    def reset_q_values(self, decay_factor: float = 0.5) -> None:
        """
        Reset Q-values to handle non-stationarity

        Args:
            decay_factor: Factor to decay Q-values (0.0 to 1.0)
        """
        for arm in self.arms.values():
            arm.q_value *= decay_factor
            logger.info(f"🔄 Reset Q-value for '{arm.arm_id}': {arm.q_value:.2f}")

    def save_state(self, filepath: str) -> None:
        """Save bandit state to file"""
        state = {
            'property_id': self.property_id,
            'epsilon': self.epsilon,
            'learning_rate': self.learning_rate,
            'discount_factor': self.discount_factor,
            'min_price': self.min_price,
            'max_price': self.max_price,
            'conservative_mode': self.conservative_mode,
            'total_pulls': self.total_pulls,
            'total_reward': self.total_reward,
            'exploration_count': self.exploration_count,
            'exploitation_count': self.exploitation_count,
            'arms': {arm_id: asdict(arm) for arm_id, arm in self.arms.items()},
            'timestamp': datetime.now().isoformat()
        }

        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)

        logger.info(f"💾 Saved bandit state to {filepath}")

    def load_state(self, filepath: str) -> None:
        """Load bandit state from file"""
        with open(filepath, 'r') as f:
            state = json.load(f)

        self.property_id = state['property_id']
        self.epsilon = state['epsilon']
        self.learning_rate = state['learning_rate']
        self.discount_factor = state['discount_factor']
        self.min_price = state['min_price']
        self.max_price = state['max_price']
        self.conservative_mode = state['conservative_mode']
        self.total_pulls = state['total_pulls']
        self.total_reward = state['total_reward']
        self.exploration_count = state['exploration_count']
        self.exploitation_count = state['exploitation_count']

        # Restore arms
        self.arms = {}
        for arm_id, arm_data in state['arms'].items():
            self.arms[arm_id] = BanditArm(**arm_data)

        logger.info(f"📂 Loaded bandit state from {filepath}")


class ThompsonSamplingBandit:
    """
    Thompson Sampling bandit using Beta distributions
    Alternative to epsilon-greedy with better exploration/exploitation balance
    """

    def __init__(
        self,
        property_id: str,
        alpha_prior: float = 1.0,
        beta_prior: float = 1.0,
        min_price: float = 50.0,
        max_price: float = 500.0
    ):
        """
        Initialize Thompson Sampling bandit

        Args:
            property_id: Property identifier
            alpha_prior: Prior for successes (Beta distribution)
            beta_prior: Prior for failures (Beta distribution)
            min_price: Minimum allowed price
            max_price: Maximum allowed price
        """
        self.property_id = property_id
        self.alpha_prior = alpha_prior
        self.beta_prior = beta_prior
        self.min_price = min_price
        self.max_price = max_price

        # Initialize arms
        self.arms: Dict[str, BanditArm] = {}
        deltas = [-15, -10, -5, 0, 5, 10, 15]
        for delta in deltas:
            arm_id = f"delta_{delta:+d}"
            self.arms[arm_id] = BanditArm(
                arm_id=arm_id,
                delta_pct=delta,
                successes=int(alpha_prior),
                failures=int(beta_prior)
            )

        logger.info(f"🎲 Initialized ThompsonSamplingBandit for property {property_id}")

    def select_arm(self, context: BanditContext) -> BanditAction:
        """
        Select arm using Thompson Sampling

        Samples from Beta(successes + α, failures + β) for each arm
        and selects the arm with highest sample
        """
        samples = {}
        for arm_id, arm in self.arms.items():
            # Sample from Beta distribution
            alpha = arm.successes + self.alpha_prior
            beta = arm.failures + self.beta_prior
            sample = np.random.beta(alpha, beta)
            samples[arm_id] = sample

        # Select arm with highest sample
        arm_id = max(samples.keys(), key=lambda k: samples[k])
        arm = self.arms[arm_id]

        # Calculate price
        adjusted_price = context.base_price * (1 + arm.delta_pct / 100.0)
        final_price = max(self.min_price, min(self.max_price, adjusted_price))

        # Create action
        action = BanditAction(
            arm_id=arm_id,
            delta_pct=arm.delta_pct,
            base_price=context.base_price,
            final_price=final_price,
            policy='thompson_sampling',
            timestamp=datetime.now().isoformat(),
            context=asdict(context)
        )

        arm.pulls += 1

        logger.info(
            f"🎲 Thompson Sampling: '{arm_id}' (sample={samples[arm_id]:.3f}, "
            f"α={alpha:.1f}, β={beta:.1f})"
        )

        return action

    def update_reward(self, arm_id: str, booking_made: bool, actual_revenue: float) -> None:
        """Update arm with booking outcome"""
        if arm_id not in self.arms:
            return

        arm = self.arms[arm_id]

        if booking_made:
            arm.successes += 1
        else:
            arm.failures += 1

        arm.total_reward += actual_revenue if booking_made else 0.0

        logger.info(
            f"💰 Thompson update '{arm_id}': booking={booking_made}, "
            f"α={arm.successes}, β={arm.failures}"
        )
