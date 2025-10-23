-- ====================================================
-- Contextual Bandit Tables
-- Task 18: RL Contextual Bandit Pilot
-- ====================================================

-- ====================================================
-- Bandit Actions Log
-- Stores every arm selection and pricing decision
-- ====================================================

CREATE TABLE IF NOT EXISTS public.bandit_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property and user
  property_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Episode identifiers
  session_id VARCHAR(100), -- Quote session ID
  stay_date DATE NOT NULL,
  quote_time TIMESTAMPTZ NOT NULL,

  -- Context features
  context_features JSONB NOT NULL, -- Full context vector
  occupancy_rate DECIMAL(5, 4),
  lead_days INTEGER,
  season VARCHAR(50),
  day_of_week INTEGER,
  is_weekend BOOLEAN,
  is_holiday BOOLEAN,
  los INTEGER,
  competitor_p50 DECIMAL(10, 2),

  -- Action taken
  arm_id VARCHAR(50) NOT NULL, -- e.g., 'delta_+5'
  delta_pct DECIMAL(5, 2) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL, -- ML baseline price
  final_price DECIMAL(10, 2) NOT NULL, -- Bandit-selected price
  policy VARCHAR(50) NOT NULL, -- 'explore' or 'exploit'

  -- Bandit state at decision time
  epsilon DECIMAL(5, 4) NOT NULL,
  q_values JSONB, -- Q-values for all arms at decision time
  arm_pulls JSONB, -- Pull counts for all arms

  -- Safety guardrails
  bounds_applied BOOLEAN DEFAULT false,
  conservative_mode BOOLEAN DEFAULT false,
  original_price DECIMAL(10, 2), -- Before safety bounds

  -- Metadata
  bandit_version VARCHAR(20) DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT bandit_actions_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bandit_actions_property_id ON public.bandit_actions(property_id);
CREATE INDEX IF NOT EXISTS idx_bandit_actions_stay_date ON public.bandit_actions(stay_date);
CREATE INDEX IF NOT EXISTS idx_bandit_actions_created_at ON public.bandit_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bandit_actions_arm_id ON public.bandit_actions(arm_id);
CREATE INDEX IF NOT EXISTS idx_bandit_actions_session_id ON public.bandit_actions(session_id);

-- ====================================================
-- Bandit Rewards Log
-- Stores outcomes (bookings, revenue) for reward calculation
-- ====================================================

CREATE TABLE IF NOT EXISTS public.bandit_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to action
  action_id UUID,
  property_id UUID NOT NULL,
  arm_id VARCHAR(50) NOT NULL,

  -- Outcome
  booking_made BOOLEAN NOT NULL,
  actual_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
  reward DECIMAL(10, 2) NOT NULL, -- Calculated reward (revenue or 0)

  -- Timing
  stay_date DATE,
  booking_date TIMESTAMPTZ,
  reward_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  source VARCHAR(50) DEFAULT 'actual', -- 'actual' or 'simulated'
  notes TEXT,

  -- Foreign keys
  CONSTRAINT bandit_rewards_action_id_fkey FOREIGN KEY (action_id)
    REFERENCES public.bandit_actions(id) ON DELETE SET NULL,
  CONSTRAINT bandit_rewards_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_action_id ON public.bandit_rewards(action_id);
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_property_id ON public.bandit_rewards(property_id);
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_arm_id ON public.bandit_rewards(arm_id);
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_booking_date ON public.bandit_rewards(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_received_at ON public.bandit_rewards(reward_received_at DESC);

-- ====================================================
-- Bandit State Snapshots
-- Periodic snapshots of bandit state (Q-values, arm stats)
-- ====================================================

CREATE TABLE IF NOT EXISTS public.bandit_state_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property identifier
  property_id UUID NOT NULL,

  -- State snapshot
  epsilon DECIMAL(5, 4) NOT NULL,
  learning_rate DECIMAL(5, 4) NOT NULL,
  total_pulls INTEGER NOT NULL DEFAULT 0,
  total_reward DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  exploration_count INTEGER NOT NULL DEFAULT 0,
  exploitation_count INTEGER NOT NULL DEFAULT 0,

  -- Arm statistics
  arm_statistics JSONB NOT NULL, -- { 'delta_+5': { q_value, pulls, reward, ... }, ... }

  -- Performance metrics
  avg_reward DECIMAL(10, 2),
  exploration_rate DECIMAL(5, 4),
  best_arm_id VARCHAR(50),

  -- Metadata
  snapshot_reason VARCHAR(100), -- 'daily', 'reset', 'manual', 'milestone'
  bandit_version VARCHAR(20) DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT bandit_state_snapshots_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bandit_snapshots_property_id ON public.bandit_state_snapshots(property_id);
CREATE INDEX IF NOT EXISTS idx_bandit_snapshots_created_at ON public.bandit_state_snapshots(created_at DESC);

-- ====================================================
-- Bandit Configuration
-- Per-property bandit settings and feature flags
-- ====================================================

CREATE TABLE IF NOT EXISTS public.bandit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property identifier
  property_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,

  -- Feature flags
  enabled BOOLEAN DEFAULT false, -- Master on/off switch
  traffic_percentage DECIMAL(5, 2) DEFAULT 5.0, -- % of traffic to route to bandit
  policy_type VARCHAR(50) DEFAULT 'epsilon-greedy', -- 'epsilon-greedy' or 'thompson-sampling'

  -- Policy parameters
  epsilon DECIMAL(5, 4) DEFAULT 0.1,
  learning_rate DECIMAL(5, 4) DEFAULT 0.1,
  discount_factor DECIMAL(5, 4) DEFAULT 0.99,

  -- Safety settings
  min_price DECIMAL(10, 2) DEFAULT 50.0,
  max_price DECIMAL(10, 2) DEFAULT 500.0,
  conservative_mode BOOLEAN DEFAULT true,

  -- Reset schedule
  reset_q_values_frequency VARCHAR(50), -- 'weekly', 'monthly', 'never'
  last_reset_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,

  -- Foreign keys
  CONSTRAINT bandit_config_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bandit_config_property_id ON public.bandit_config(property_id);
CREATE INDEX IF NOT EXISTS idx_bandit_config_enabled ON public.bandit_config(enabled) WHERE enabled = true;

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_bandit_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bandit_config_updated_at_trigger
  BEFORE UPDATE ON public.bandit_config
  FOR EACH ROW
  EXECUTE FUNCTION update_bandit_config_updated_at();

-- ====================================================
-- RLS Policies
-- ====================================================

ALTER TABLE public.bandit_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandit_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandit_state_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandit_config ENABLE ROW LEVEL SECURITY;

-- Users can read their own property's bandit data
CREATE POLICY "Users can read their bandit actions"
  ON public.bandit_actions
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE userid = auth.uid()
    )
  );

CREATE POLICY "Users can read their bandit rewards"
  ON public.bandit_rewards
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE userid = auth.uid()
    )
  );

CREATE POLICY "Users can read their bandit snapshots"
  ON public.bandit_state_snapshots
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE userid = auth.uid()
    )
  );

CREATE POLICY "Users can manage their bandit config"
  ON public.bandit_config
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can manage all bandit data
CREATE POLICY "Service role can manage bandit actions"
  ON public.bandit_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage bandit rewards"
  ON public.bandit_rewards
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage bandit snapshots"
  ON public.bandit_state_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage bandit config"
  ON public.bandit_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ====================================================
-- Helper Functions
-- ====================================================

-- Get recent bandit performance
CREATE OR REPLACE FUNCTION get_bandit_performance(
  p_property_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  total_actions INTEGER,
  total_rewards DECIMAL,
  avg_reward DECIMAL,
  conversion_rate DECIMAL,
  exploration_rate DECIMAL,
  best_arm VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ba.id)::INTEGER AS total_actions,
    COALESCE(SUM(br.reward), 0.0)::DECIMAL AS total_rewards,
    COALESCE(AVG(br.reward), 0.0)::DECIMAL AS avg_reward,
    (COUNT(CASE WHEN br.booking_made THEN 1 END)::DECIMAL / NULLIF(COUNT(ba.id), 0))::DECIMAL AS conversion_rate,
    (COUNT(CASE WHEN ba.policy = 'explore' THEN 1 END)::DECIMAL / NULLIF(COUNT(ba.id), 0))::DECIMAL AS exploration_rate,
    MODE() WITHIN GROUP (ORDER BY ba.arm_id)::VARCHAR AS best_arm
  FROM public.bandit_actions ba
  LEFT JOIN public.bandit_rewards br ON ba.id = br.action_id
  WHERE ba.property_id = p_property_id
    AND ba.created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get arm statistics
CREATE OR REPLACE FUNCTION get_arm_statistics(
  p_property_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  arm_id VARCHAR,
  pulls INTEGER,
  avg_reward DECIMAL,
  conversion_rate DECIMAL,
  revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ba.arm_id,
    COUNT(ba.id)::INTEGER AS pulls,
    COALESCE(AVG(br.reward), 0.0)::DECIMAL AS avg_reward,
    (COUNT(CASE WHEN br.booking_made THEN 1 END)::DECIMAL / NULLIF(COUNT(ba.id), 0))::DECIMAL AS conversion_rate,
    COALESCE(SUM(br.reward), 0.0)::DECIMAL AS revenue
  FROM public.bandit_actions ba
  LEFT JOIN public.bandit_rewards br ON ba.id = br.action_id
  WHERE ba.property_id = p_property_id
    AND ba.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ba.arm_id
  ORDER BY pulls DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- Comments
-- ====================================================

COMMENT ON TABLE public.bandit_actions IS 'Logs every bandit arm selection and pricing decision';
COMMENT ON TABLE public.bandit_rewards IS 'Logs booking outcomes and rewards for bandit learning';
COMMENT ON TABLE public.bandit_state_snapshots IS 'Periodic snapshots of bandit Q-values and statistics';
COMMENT ON TABLE public.bandit_config IS 'Per-property bandit configuration and feature flags';

COMMENT ON COLUMN public.bandit_actions.arm_id IS 'Selected arm identifier (e.g., delta_+5)';
COMMENT ON COLUMN public.bandit_actions.policy IS 'Explore (random) or exploit (greedy)';
COMMENT ON COLUMN public.bandit_actions.q_values IS 'Q-values snapshot at decision time';

COMMENT ON COLUMN public.bandit_config.traffic_percentage IS 'Percentage of traffic routed to bandit (0-100)';
COMMENT ON COLUMN public.bandit_config.epsilon IS 'Exploration rate for epsilon-greedy policy';

-- ====================================================
-- Grant Permissions
-- ====================================================

GRANT SELECT ON public.bandit_actions TO authenticated;
GRANT SELECT ON public.bandit_rewards TO authenticated;
GRANT SELECT ON public.bandit_state_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bandit_config TO authenticated;

GRANT ALL ON public.bandit_actions TO service_role;
GRANT ALL ON public.bandit_rewards TO service_role;
GRANT ALL ON public.bandit_state_snapshots TO service_role;
GRANT ALL ON public.bandit_config TO service_role;
