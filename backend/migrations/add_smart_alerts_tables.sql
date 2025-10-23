-- ========================================
-- SMART ALERTS SERVICE DATABASE SCHEMA
-- ========================================
-- Creates tables for proactive alerting system that monitors:
--   - Competitor pricing changes
--   - Demand fluctuations
--   - Weather events
--   - Upcoming holidays
--   - Occupancy thresholds
--
-- Features:
--   - Rule-based alert engine
--   - Per-property configuration
--   - Alert scoring and prioritization
--   - De-duplication and throttling
--   - Quiet hours support
--   - Email digest delivery
--
-- Author: Engineering Team
-- Date: 2025-10-23
-- ========================================

-- ========================================
-- 1. ALERT RULES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "propertyId" TEXT REFERENCES properties(id) ON DELETE CASCADE,

  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  -- Rule types:
  --   - competitor_price_spike
  --   - competitor_price_drop
  --   - demand_surge
  --   - demand_decline
  --   - occupancy_low
  --   - occupancy_high
  --   - weather_event
  --   - holiday_upcoming
  --   - price_optimization

  -- Rule configuration (JSONB for flexibility)
  conditions JSONB NOT NULL,
  -- Example conditions:
  -- {
  --   "threshold": 10,
  --   "comparison": "greater_than",
  --   "timeframe": "7d",
  --   "metric": "competitor_median_price_change_percent"
  -- }

  -- Alert settings
  severity TEXT NOT NULL DEFAULT 'medium',
  -- Severity: low, medium, high, critical

  priority INT DEFAULT 50,
  -- Priority: 0-100 (higher = more important)

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  trigger_count INT DEFAULT 0,

  -- Throttling (prevent alert spam)
  min_interval_hours INT DEFAULT 24,
  -- Minimum hours between triggers

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_rule_type CHECK (rule_type IN (
    'competitor_price_spike',
    'competitor_price_drop',
    'demand_surge',
    'demand_decline',
    'occupancy_low',
    'occupancy_high',
    'weather_event',
    'holiday_upcoming',
    'price_optimization'
  )),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 100)
);

-- Enable Row Level Security
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_alert_rules_user ON alert_rules("userId");
CREATE INDEX idx_alert_rules_property ON alert_rules("propertyId");
CREATE INDEX idx_alert_rules_type ON alert_rules(rule_type) WHERE is_active = TRUE;
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active, "userId") WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE alert_rules IS 'Alert rules for proactive monitoring and notifications';
COMMENT ON COLUMN alert_rules.conditions IS 'JSONB configuration for rule evaluation';
COMMENT ON COLUMN alert_rules.min_interval_hours IS 'Minimum hours between repeated alerts (throttling)';

-- ========================================
-- 2. ALERT HISTORY TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "propertyId" TEXT REFERENCES properties(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  priority INT NOT NULL,

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  -- Data contains context for the alert:
  -- {
  --   "current_value": 150,
  --   "previous_value": 100,
  --   "change_percent": 50,
  --   "threshold": 10,
  --   "date_range": "2025-10-16 to 2025-10-23"
  -- }

  -- Alert status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending, sent, read, dismissed, snoozed

  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  snoozed_until TIMESTAMP,

  -- Delivery
  delivery_method TEXT DEFAULT 'email',
  -- Methods: email, in_app, push, webhook

  delivery_status TEXT,
  delivery_error TEXT,

  -- Actions
  action_url TEXT,
  -- Deep link to relevant page (e.g., pricing dashboard)

  action_taken BOOLEAN DEFAULT FALSE,
  action_taken_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'read', 'dismissed', 'snoozed')),
  CONSTRAINT valid_delivery_method CHECK (delivery_method IN ('email', 'in_app', 'push', 'webhook'))
);

-- Enable Row Level Security
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_alert_history_user ON alert_history("userId", created_at DESC);
CREATE INDEX idx_alert_history_property ON alert_history("propertyId", created_at DESC);
CREATE INDEX idx_alert_history_rule ON alert_history(alert_rule_id, created_at DESC);
CREATE INDEX idx_alert_history_status ON alert_history(status, created_at DESC);
CREATE INDEX idx_alert_history_pending ON alert_history(status) WHERE status = 'pending';

-- Comments
COMMENT ON TABLE alert_history IS 'History of all triggered alerts and their status';
COMMENT ON COLUMN alert_history.data IS 'Alert-specific context data (metrics, changes, etc.)';
COMMENT ON COLUMN alert_history.action_url IS 'Deep link to take action on alert';

-- ========================================
-- 3. ALERT SETTINGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS alert_settings (
  "userId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Global alert preferences
  alerts_enabled BOOLEAN DEFAULT TRUE,

  -- Delivery preferences
  email_alerts_enabled BOOLEAN DEFAULT TRUE,
  in_app_alerts_enabled BOOLEAN DEFAULT TRUE,

  -- Email digest settings
  digest_frequency TEXT DEFAULT 'daily',
  -- Frequency: real_time, hourly, daily, weekly

  digest_time TIME DEFAULT '08:00:00',
  -- Preferred time for daily digest (user's timezone)

  timezone TEXT DEFAULT 'UTC',

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',

  -- Alert filtering
  min_severity TEXT DEFAULT 'low',
  -- Only send alerts >= this severity

  max_alerts_per_day INT DEFAULT 10,
  -- Rate limiting per user

  -- Notification preferences (JSONB for flexibility)
  notification_preferences JSONB DEFAULT '{}',
  -- Example:
  -- {
  --   "competitor_alerts": true,
  --   "demand_alerts": true,
  --   "weather_alerts": false,
  --   "holiday_alerts": true
  -- }

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_digest_frequency CHECK (digest_frequency IN ('real_time', 'hourly', 'daily', 'weekly')),
  CONSTRAINT valid_min_severity CHECK (min_severity IN ('low', 'medium', 'high', 'critical'))
);

-- Enable Row Level Security
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE alert_settings IS 'Per-user alert configuration and preferences';
COMMENT ON COLUMN alert_settings.digest_frequency IS 'How often to send email digests';
COMMENT ON COLUMN alert_settings.quiet_hours_enabled IS 'Suppress alerts during quiet hours';

-- ========================================
-- 4. ALERT EVALUATION LOG (OPTIONAL)
-- ========================================

CREATE TABLE IF NOT EXISTS alert_evaluation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  evaluated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Evaluation result
  triggered BOOLEAN NOT NULL,
  reason TEXT,

  -- Evaluation context
  evaluation_data JSONB,

  -- Performance tracking
  evaluation_time_ms INT
);

-- Partition by month (optional, for large volumes)
CREATE INDEX idx_alert_evaluation_log_rule ON alert_evaluation_log(alert_rule_id, evaluated_at DESC);
CREATE INDEX idx_alert_evaluation_log_date ON alert_evaluation_log(evaluated_at DESC);

-- Auto-cleanup old logs (keep 90 days)
CREATE INDEX idx_alert_evaluation_log_cleanup ON alert_evaluation_log(evaluated_at)
  WHERE evaluated_at < NOW() - INTERVAL '90 days';

-- Comments
COMMENT ON TABLE alert_evaluation_log IS 'Log of alert rule evaluations for debugging and optimization';

-- ========================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ========================================

-- Alert Rules Policies
CREATE POLICY "select_own_alert_rules" ON alert_rules
  FOR SELECT USING (auth.uid() = "userId"::uuid);

CREATE POLICY "insert_own_alert_rules" ON alert_rules
  FOR INSERT WITH CHECK (auth.uid() = "userId"::uuid);

CREATE POLICY "update_own_alert_rules" ON alert_rules
  FOR UPDATE USING (auth.uid() = "userId"::uuid);

CREATE POLICY "delete_own_alert_rules" ON alert_rules
  FOR DELETE USING (auth.uid() = "userId"::uuid);

-- Alert History Policies
CREATE POLICY "select_own_alert_history" ON alert_history
  FOR SELECT USING (auth.uid() = "userId"::uuid);

CREATE POLICY "insert_own_alert_history" ON alert_history
  FOR INSERT WITH CHECK (auth.uid() = "userId"::uuid);

CREATE POLICY "update_own_alert_history" ON alert_history
  FOR UPDATE USING (auth.uid() = "userId"::uuid);

-- Alert Settings Policies
CREATE POLICY "select_own_alert_settings" ON alert_settings
  FOR SELECT USING (auth.uid() = "userId"::uuid);

CREATE POLICY "insert_own_alert_settings" ON alert_settings
  FOR INSERT WITH CHECK (auth.uid() = "userId"::uuid);

CREATE POLICY "update_own_alert_settings" ON alert_settings
  FOR UPDATE USING (auth.uid() = "userId"::uuid);

-- ========================================
-- 6. DEFAULT ALERT RULES (EXAMPLES)
-- ========================================

-- Function to create default alert rules for new users
CREATE OR REPLACE FUNCTION create_default_alert_rules(p_user_id UUID, p_property_id TEXT)
RETURNS void AS $$
BEGIN
  -- Competitor price spike alert
  INSERT INTO alert_rules ("userId", "propertyId", name, description, rule_type, conditions, severity, priority)
  VALUES (
    p_user_id,
    p_property_id,
    'Competitor Price Spike',
    'Alert when competitor median price increases >15% vs 7-day baseline',
    'competitor_price_spike',
    '{"threshold": 15, "comparison": "greater_than", "timeframe": "7d", "metric": "competitor_median_price_change_percent"}',
    'high',
    80
  );

  -- Low occupancy alert
  INSERT INTO alert_rules ("userId", "propertyId", name, description, rule_type, conditions, severity, priority)
  VALUES (
    p_user_id,
    p_property_id,
    'Low Occupancy Warning',
    'Alert when occupancy falls below 40%',
    'occupancy_low',
    '{"threshold": 40, "comparison": "less_than", "metric": "occupancy_percent"}',
    'medium',
    60
  );

  -- Holiday upcoming alert
  INSERT INTO alert_rules ("userId", "propertyId", name, description, rule_type, conditions, severity, priority)
  VALUES (
    p_user_id,
    p_property_id,
    'Holiday Approaching',
    'Alert 7 days before major holidays',
    'holiday_upcoming',
    '{"days_before": 7, "holiday_types": ["national", "regional"]}',
    'medium',
    70
  );

  -- Weather event alert
  INSERT INTO alert_rules ("userId", "propertyId", name, description, rule_type, conditions, severity, priority)
  VALUES (
    p_user_id,
    p_property_id,
    'Extreme Weather Alert',
    'Alert for extreme weather events (storms, heatwaves, etc.)',
    'weather_event',
    '{"event_types": ["storm", "extreme_heat", "extreme_cold"], "severity_min": "moderate"}',
    'high',
    75
  );

  -- Demand surge alert
  INSERT INTO alert_rules ("userId", "propertyId", name, description, rule_type, conditions, severity, priority)
  VALUES (
    p_user_id,
    p_property_id,
    'Demand Surge Detected',
    'Alert when booking rate increases >50% vs historical average',
    'demand_surge',
    '{"threshold": 50, "comparison": "greater_than", "timeframe": "7d", "metric": "booking_rate_change_percent"}',
    'high',
    85
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. HELPER FUNCTIONS
-- ========================================

-- Check if alert should be throttled
CREATE OR REPLACE FUNCTION should_throttle_alert(
  p_alert_rule_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  last_triggered TIMESTAMP;
  min_interval_hours INT;
BEGIN
  SELECT last_triggered_at, min_interval_hours
  INTO last_triggered, min_interval_hours
  FROM alert_rules
  WHERE id = p_alert_rule_id;

  -- If never triggered, don't throttle
  IF last_triggered IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if enough time has passed
  RETURN (NOW() - last_triggered) < (min_interval_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Check if currently in quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  settings RECORD;
  current_time_user TIME;
BEGIN
  SELECT * INTO settings
  FROM alert_settings
  WHERE "userId" = p_user_id;

  -- If no settings or quiet hours disabled, not in quiet hours
  IF settings IS NULL OR NOT settings.quiet_hours_enabled THEN
    RETURN FALSE;
  END IF;

  -- Convert current time to user's timezone
  -- TODO: Implement proper timezone conversion
  current_time_user := NOW()::TIME;

  -- Check if current time is within quiet hours
  IF settings.quiet_hours_start < settings.quiet_hours_end THEN
    -- Normal case: e.g., 22:00 to 08:00 next day
    RETURN current_time_user >= settings.quiet_hours_start
       AND current_time_user < settings.quiet_hours_end;
  ELSE
    -- Wraps midnight: e.g., 22:00 to 08:00
    RETURN current_time_user >= settings.quiet_hours_start
        OR current_time_user < settings.quiet_hours_end;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Get pending alerts for user
CREATE OR REPLACE FUNCTION get_pending_alerts(
  p_user_id UUID,
  p_min_severity TEXT DEFAULT 'low'
)
RETURNS TABLE(
  alert_id UUID,
  alert_type TEXT,
  severity TEXT,
  title TEXT,
  message TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.alert_type,
    h.severity,
    h.title,
    h.message,
    h.created_at
  FROM alert_history h
  WHERE h."userId" = p_user_id
    AND h.status = 'pending'
    AND h.severity >= p_min_severity
  ORDER BY h.priority DESC, h.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Mark alert as sent
CREATE OR REPLACE FUNCTION mark_alert_sent(
  p_alert_id UUID,
  p_delivery_method TEXT DEFAULT 'email'
)
RETURNS void AS $$
BEGIN
  UPDATE alert_history
  SET
    status = 'sent',
    sent_at = NOW(),
    delivery_method = p_delivery_method
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Dismiss alert
CREATE OR REPLACE FUNCTION dismiss_alert(p_alert_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE alert_history
  SET
    status = 'dismissed',
    dismissed_at = NOW()
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Snooze alert
CREATE OR REPLACE FUNCTION snooze_alert(
  p_alert_id UUID,
  p_hours INT DEFAULT 24
)
RETURNS void AS $$
BEGIN
  UPDATE alert_history
  SET
    status = 'snoozed',
    snoozed_until = NOW() + (p_hours || ' hours')::INTERVAL
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. CLEANUP JOBS
-- ========================================

-- Clean up old alert history (keep 180 days)
CREATE OR REPLACE FUNCTION cleanup_alert_history()
RETURNS void AS $$
BEGIN
  DELETE FROM alert_history
  WHERE created_at < NOW() - INTERVAL '180 days';

  DELETE FROM alert_evaluation_log
  WHERE evaluated_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if enabled)
/*
SELECT cron.schedule(
  'cleanup-alerts',
  '0 4 * * *',  -- 4 AM daily
  $$SELECT cleanup_alert_history()$$
);
*/

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
--   1. Run this migration via Supabase dashboard or CLI
--   2. Implement alert evaluation engine (see alertEngine.ts)
--   3. Create alert scheduler job (see alertScheduler.ts)
--   4. Design email templates (see email-templates/)
--   5. Build alert settings UI
-- ========================================
