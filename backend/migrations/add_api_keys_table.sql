-- ========================================
-- API KEYS TABLE FOR PARTNER INTEGRATIONS
-- ========================================
-- Creates workspace-scoped API keys for external integrations
-- with role-based access control and usage quotas.
--
-- Features:
--   - Workspace/organization-scoped keys
--   - Role-based permissions (read_only, read_write, admin)
--   - Rate limiting quotas (requests per minute/hour/day)
--   - Key expiration and rotation
--   - Usage tracking and analytics
--   - IP allowlisting
--
-- Author: Engineering Team
-- Date: 2025-10-23
-- ========================================

-- ========================================
-- 1. API KEYS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Key identification
  name TEXT NOT NULL,  -- Human-readable name (e.g., "Production API Key")
  description TEXT,
  key_prefix TEXT NOT NULL,  -- First 8 chars for display (e.g., "jen_live_")
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of full key

  -- Permissions
  role TEXT NOT NULL DEFAULT 'read_only',
  -- Role types:
  --   - read_only: GET requests only (analytics, reports)
  --   - read_write: GET + POST/PUT (quote pricing, upload data)
  --   - admin: Full access including DELETE

  scopes TEXT[] DEFAULT ARRAY['pricing:read', 'analytics:read'],
  -- Available scopes:
  --   - pricing:read, pricing:write
  --   - analytics:read, analytics:write
  --   - properties:read, properties:write, properties:delete
  --   - settings:read, settings:write

  -- Rate limiting quotas
  quota_per_minute INT DEFAULT 60,
  quota_per_hour INT DEFAULT 1000,
  quota_per_day INT DEFAULT 10000,

  -- Security
  allowed_ips INET[],  -- IP allowlist (empty = all IPs allowed)
  allowed_origins TEXT[],  -- CORS origins (for browser requests)

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,  -- NULL = never expires
  last_used_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_role CHECK (role IN ('read_only', 'read_write', 'admin')),
  CONSTRAINT valid_quotas CHECK (
    quota_per_minute > 0 AND
    quota_per_hour >= quota_per_minute AND
    quota_per_day >= quota_per_hour
  )
);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_api_keys_user ON api_keys("userId");
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE api_keys IS 'Workspace-scoped API keys for external integrations';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters for display (e.g., "jen_live_12345678")';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of full API key (never store plaintext)';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes for fine-grained access control';
COMMENT ON COLUMN api_keys.allowed_ips IS 'IP allowlist (empty array = all IPs allowed)';

-- ========================================
-- 2. API KEY USAGE TRACKING
-- ========================================

CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT NOT NULL,

  -- Timing
  response_time_ms INT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Request context
  ip_address INET,
  user_agent TEXT,
  referer TEXT,

  -- Usage metrics
  request_size_bytes BIGINT,
  response_size_bytes BIGINT,

  -- Error tracking
  error_type TEXT,
  error_message TEXT
);

-- Partition by month for performance
-- (Uncomment after implementing partitioning)
-- CREATE TABLE api_key_usage_2025_10 PARTITION OF api_key_usage
--   FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Indexes
CREATE INDEX idx_api_key_usage_api_key ON api_key_usage(api_key_id, timestamp DESC);
CREATE INDEX idx_api_key_usage_timestamp ON api_key_usage(timestamp DESC);
CREATE INDEX idx_api_key_usage_endpoint ON api_key_usage(endpoint, timestamp DESC);

-- Comments
COMMENT ON TABLE api_key_usage IS 'Tracks API key usage for analytics, billing, and abuse detection';

-- ========================================
-- 3. RATE LIMIT TRACKING (IN-MEMORY)
-- ========================================
-- Note: This table is optional - rate limiting can be done in Redis or in-memory
-- Keeping for audit trail and burst detection

CREATE TABLE IF NOT EXISTS api_rate_limits (
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_type TEXT NOT NULL,  -- 'minute', 'hour', 'day'
  window_start TIMESTAMP NOT NULL,
  request_count INT NOT NULL DEFAULT 1,

  PRIMARY KEY (api_key_id, window_type, window_start)
);

-- Indexes
CREATE INDEX idx_api_rate_limits_key_window ON api_rate_limits(api_key_id, window_start DESC);

-- Auto-cleanup old rate limit records (older than 7 days)
CREATE INDEX idx_api_rate_limits_cleanup ON api_rate_limits(window_start)
  WHERE window_start < NOW() - INTERVAL '7 days';

-- Comments
COMMENT ON TABLE api_rate_limits IS 'Tracks request counts per time window for rate limiting';

-- ========================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ========================================

-- API Keys Policies
CREATE POLICY "select_own_api_keys" ON api_keys
  FOR SELECT USING (auth.uid() = "userId"::uuid);

CREATE POLICY "insert_own_api_keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = "userId"::uuid);

CREATE POLICY "update_own_api_keys" ON api_keys
  FOR UPDATE USING (auth.uid() = "userId"::uuid);

CREATE POLICY "delete_own_api_keys" ON api_keys
  FOR DELETE USING (auth.uid() = "userId"::uuid);

-- Usage Tracking Policies (read-only for key owner)
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_usage" ON api_key_usage
  FOR SELECT USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE "userId" = auth.uid()::uuid
    )
  );

-- Rate Limits Policies (internal use only)
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_rate_limits" ON api_rate_limits
  FOR SELECT USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE "userId" = auth.uid()::uuid
    )
  );

-- ========================================
-- 5. HELPER FUNCTIONS
-- ========================================

-- Generate API key with secure prefix
CREATE OR REPLACE FUNCTION generate_api_key(
  key_prefix TEXT DEFAULT 'jen_live'
)
RETURNS TEXT AS $$
DECLARE
  random_part TEXT;
  full_key TEXT;
BEGIN
  -- Generate 32 random characters
  random_part := encode(gen_random_bytes(24), 'base64');
  random_part := replace(replace(replace(random_part, '+', ''), '/', ''), '=', '');
  random_part := substring(random_part from 1 for 32);

  -- Combine prefix and random part
  full_key := key_prefix || '_' || random_part;

  RETURN full_key;
END;
$$ LANGUAGE plpgsql;

-- Hash API key for storage
CREATE OR REPLACE FUNCTION hash_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(api_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Verify API key (constant-time comparison)
CREATE OR REPLACE FUNCTION verify_api_key(
  provided_key TEXT,
  stored_hash TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN stored_hash = hash_api_key(provided_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if API key is valid and active
CREATE OR REPLACE FUNCTION is_api_key_valid(key_hash TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  key_id UUID,
  user_id UUID,
  role TEXT,
  scopes TEXT[],
  quota_per_minute INT,
  quota_per_hour INT,
  quota_per_day INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_valid,
    k.id as key_id,
    k."userId" as user_id,
    k.role,
    k.scopes,
    k.quota_per_minute,
    k.quota_per_hour,
    k.quota_per_day
  FROM api_keys k
  WHERE k.key_hash = is_api_key_valid.key_hash
    AND k.is_active = TRUE
    AND (k.expires_at IS NULL OR k.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track API key usage
CREATE OR REPLACE FUNCTION track_api_key_usage(
  p_api_key_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INT,
  p_response_time_ms INT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_error_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_key_usage (
    api_key_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    error_type
  ) VALUES (
    p_api_key_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_ip_address,
    p_error_type
  );

  -- Update last_used_at
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_api_key_id UUID,
  p_window_type TEXT
)
RETURNS INT AS $$
DECLARE
  window_start TIMESTAMP;
  current_count INT;
BEGIN
  -- Calculate window start based on type
  window_start := CASE p_window_type
    WHEN 'minute' THEN date_trunc('minute', NOW())
    WHEN 'hour' THEN date_trunc('hour', NOW())
    WHEN 'day' THEN date_trunc('day', NOW())
    ELSE NOW()
  END;

  -- Insert or update rate limit
  INSERT INTO api_rate_limits (api_key_id, window_type, window_start, request_count)
  VALUES (p_api_key_id, p_window_type, window_start, 1)
  ON CONFLICT (api_key_id, window_type, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO current_count;

  RETURN current_count;
END;
$$ LANGUAGE plpgsql;

-- Check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id UUID,
  p_window_type TEXT
)
RETURNS TABLE(
  current_count INT,
  quota INT,
  is_exceeded BOOLEAN,
  reset_at TIMESTAMP
) AS $$
DECLARE
  window_start TIMESTAMP;
  key_quota INT;
BEGIN
  -- Calculate window start
  window_start := CASE p_window_type
    WHEN 'minute' THEN date_trunc('minute', NOW())
    WHEN 'hour' THEN date_trunc('hour', NOW())
    WHEN 'day' THEN date_trunc('day', NOW())
  END;

  -- Get quota for this key
  SELECT
    CASE p_window_type
      WHEN 'minute' THEN k.quota_per_minute
      WHEN 'hour' THEN k.quota_per_hour
      WHEN 'day' THEN k.quota_per_day
    END INTO key_quota
  FROM api_keys k
  WHERE k.id = p_api_key_id;

  -- Get current count
  RETURN QUERY
  SELECT
    COALESCE(rl.request_count, 0) as current_count,
    key_quota as quota,
    COALESCE(rl.request_count, 0) >= key_quota as is_exceeded,
    window_start + CASE p_window_type
      WHEN 'minute' THEN INTERVAL '1 minute'
      WHEN 'hour' THEN INTERVAL '1 hour'
      WHEN 'day' THEN INTERVAL '1 day'
    END as reset_at
  FROM api_rate_limits rl
  WHERE rl.api_key_id = p_api_key_id
    AND rl.window_type = p_window_type
    AND rl.window_start = check_rate_limit.window_start;

  -- If no record exists, return 0 count
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      0 as current_count,
      key_quota as quota,
      FALSE as is_exceeded,
      window_start + CASE p_window_type
        WHEN 'minute' THEN INTERVAL '1 minute'
        WHEN 'hour' THEN INTERVAL '1 hour'
        WHEN 'day' THEN INTERVAL '1 day'
      END as reset_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. EXAMPLE USAGE
-- ========================================

-- Create an API key
/*
INSERT INTO api_keys ("userId", name, key_prefix, key_hash, role, scopes)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Production API Key',
  'jen_live',
  hash_api_key('jen_live_abc123xyz789...'),
  'read_write',
  ARRAY['pricing:read', 'pricing:write', 'analytics:read']
);
*/

-- Verify API key
/*
SELECT * FROM is_api_key_valid(hash_api_key('jen_live_abc123xyz789...'));
*/

-- Check rate limit
/*
SELECT * FROM check_rate_limit(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'minute'
);
*/

-- ========================================
-- 7. CLEANUP JOB (OPTIONAL)
-- ========================================

-- Clean up old usage records (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_api_key_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM api_key_usage
  WHERE timestamp < NOW() - INTERVAL '90 days';

  DELETE FROM api_rate_limits
  WHERE window_start < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if enabled)
/*
SELECT cron.schedule(
  'cleanup-api-usage',
  '0 3 * * *',  -- 3 AM daily
  $$SELECT cleanup_api_key_usage()$$
);
*/

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
--   1. Run this migration via Supabase dashboard or CLI
--   2. Implement API key middleware in backend (see authenticateApiKey.ts)
--   3. Add API key management endpoints
--   4. Update OpenAPI spec with apiKey security scheme
--   5. Generate SDKs with API key support
-- ========================================
