-- ============================================
-- Competitor Monitoring Tables
-- ============================================
-- Created: 2025-10-26
-- Description: Tables for tracking competitor campsites and their pricing history

-- Competitors Table
-- Stores campsite information for monitored competitors
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Campsite identification
  campsite_id TEXT NOT NULL,  -- ID from camping-and-co.com
  name TEXT NOT NULL,
  url TEXT NOT NULL,

  -- Visual data
  photo_url TEXT,
  photos TEXT[], -- Array of photo URLs

  -- Location
  address TEXT,
  town TEXT,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance DECIMAL(6, 2), -- Distance from user's property in km
  distance_text TEXT,

  -- Ratings and reviews
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,

  -- Additional data
  amenities TEXT[],
  description TEXT,

  -- Monitoring status
  is_monitoring BOOLEAN DEFAULT TRUE,
  monitoring_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_scraped_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, campsite_id)
);

-- Competitor Pricing History Table
-- Stores daily pricing data scraped from competitors
CREATE TABLE IF NOT EXISTS competitor_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,

  -- Pricing data
  date DATE NOT NULL,
  price DECIMAL(10, 2),
  original_price DECIMAL(10, 2), -- If discounted
  occupancy INTEGER DEFAULT 4,

  -- Availability
  availability TEXT CHECK (availability IN ('available', 'limited', 'unavailable')),

  -- Metadata
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(competitor_id, date, occupancy)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitors_user_monitoring ON competitors(user_id, is_monitoring);
CREATE INDEX IF NOT EXISTS idx_competitors_campsite_id ON competitors(campsite_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_competitor ON competitor_pricing(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_date ON competitor_pricing(competitor_id, date);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_scraped_at ON competitor_pricing(scraped_at);

-- ============================================
-- Row-Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_pricing ENABLE ROW LEVEL SECURITY;

-- Competitors: Users can only see their own competitors
CREATE POLICY "Users can view their own competitors"
  ON competitors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own competitors"
  ON competitors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own competitors"
  ON competitors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own competitors"
  ON competitors FOR DELETE
  USING (auth.uid() = user_id);

-- Competitor Pricing: Users can only see pricing for their competitors
CREATE POLICY "Users can view pricing for their competitors"
  ON competitor_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitors
      WHERE competitors.id = competitor_pricing.competitor_id
      AND competitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all pricing data"
  ON competitor_pricing FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Updated At Trigger
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for competitors table
DROP TRIGGER IF EXISTS update_competitors_updated_at ON competitors;
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helpful Views
-- ============================================

-- View: Competitors with latest pricing
CREATE OR REPLACE VIEW competitors_with_latest_price AS
SELECT
  c.*,
  cp.date AS latest_price_date,
  cp.price AS latest_price,
  cp.availability AS latest_availability
FROM competitors c
LEFT JOIN LATERAL (
  SELECT date, price, availability
  FROM competitor_pricing
  WHERE competitor_id = c.id
  ORDER BY date DESC
  LIMIT 1
) cp ON true
WHERE c.is_monitoring = true;

-- View: Competitor count by user
CREATE OR REPLACE VIEW competitor_stats_by_user AS
SELECT
  user_id,
  COUNT(*) as total_competitors,
  COUNT(*) FILTER (WHERE is_monitoring = true) as monitoring_count,
  COUNT(*) FILTER (WHERE is_monitoring = false) as paused_count,
  MAX(created_at) as last_added_at
FROM competitors
GROUP BY user_id;

-- ============================================
-- Sample Queries
-- ============================================

-- Get all monitored competitors for a user
-- SELECT * FROM competitors
-- WHERE user_id = 'your-user-id' AND is_monitoring = true
-- ORDER BY distance ASC;

-- Get pricing history for a competitor (last 30 days)
-- SELECT * FROM competitor_pricing
-- WHERE competitor_id = 'competitor-uuid'
-- AND date >= CURRENT_DATE - INTERVAL '30 days'
-- ORDER BY date DESC;

-- Get price trends (average price by week)
-- SELECT
--   DATE_TRUNC('week', date) as week,
--   AVG(price) as avg_price,
--   MIN(price) as min_price,
--   MAX(price) as max_price
-- FROM competitor_pricing
-- WHERE competitor_id = 'competitor-uuid'
-- AND date >= CURRENT_DATE - INTERVAL '90 days'
-- GROUP BY week
-- ORDER BY week DESC;

-- ============================================
-- Done!
-- ============================================
