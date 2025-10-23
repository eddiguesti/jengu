-- ====================================================
-- Competitor Daily Pricing Data
-- Stores aggregated competitor price bands (P10, P50, P90)
-- ====================================================

-- Main competitor daily pricing table
CREATE TABLE IF NOT EXISTS public.competitor_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property reference
  property_id UUID NOT NULL,

  -- Date for pricing
  date DATE NOT NULL,

  -- Price percentiles (daily bands)
  price_p10 DECIMAL(10, 2) NOT NULL, -- 10th percentile (low)
  price_p50 DECIMAL(10, 2) NOT NULL, -- 50th percentile (median)
  price_p90 DECIMAL(10, 2) NOT NULL, -- 90th percentile (high)

  -- Metadata
  source VARCHAR(100) NOT NULL DEFAULT 'playwright', -- scraper source
  competitor_count INTEGER NOT NULL DEFAULT 0, -- number of competitors sampled
  location JSONB, -- geo location used for search
  search_params JSONB, -- room type, guests, etc.

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT competitor_daily_property_date_key UNIQUE(property_id, date),
  CONSTRAINT competitor_daily_price_p10_positive CHECK (price_p10 > 0),
  CONSTRAINT competitor_daily_price_p50_positive CHECK (price_p50 > 0),
  CONSTRAINT competitor_daily_price_p90_positive CHECK (price_p90 > 0),
  CONSTRAINT competitor_daily_percentiles_ordered CHECK (price_p10 <= price_p50 AND price_p50 <= price_p90)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitor_daily_property_id ON public.competitor_daily(property_id);
CREATE INDEX IF NOT EXISTS idx_competitor_daily_date ON public.competitor_daily(date);
CREATE INDEX IF NOT EXISTS idx_competitor_daily_property_date ON public.competitor_daily(property_id, date);
CREATE INDEX IF NOT EXISTS idx_competitor_daily_scraped_at ON public.competitor_daily(scraped_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_competitor_daily_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competitor_daily_updated_at_trigger
  BEFORE UPDATE ON public.competitor_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_daily_updated_at();

-- RLS policies (Row Level Security)
ALTER TABLE public.competitor_daily ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own property's competitor data
CREATE POLICY "Users can read their property competitor data"
  ON public.competitor_daily
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE userid = auth.uid()
    )
  );

-- Policy: Service role can insert/update competitor data
CREATE POLICY "Service role can manage competitor data"
  ON public.competitor_daily
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ====================================================
-- Competitor Scraping Targets Table
-- Defines which properties to scrape and their config
-- ====================================================

CREATE TABLE IF NOT EXISTS public.competitor_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property reference
  property_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,

  -- Search configuration
  location JSONB NOT NULL, -- { latitude, longitude, city, country }
  room_type VARCHAR(100) DEFAULT 'standard', -- room type to search
  guests INTEGER DEFAULT 2,
  search_radius_km INTEGER DEFAULT 5, -- search radius in km

  -- Scraping schedule
  enabled BOOLEAN DEFAULT true,
  scrape_frequency VARCHAR(50) DEFAULT 'daily', -- daily, weekly, etc.
  last_scraped_at TIMESTAMPTZ,
  next_scrape_at TIMESTAMPTZ,

  -- Metadata
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT competitor_targets_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_targets_property_id ON public.competitor_targets(property_id);
CREATE INDEX IF NOT EXISTS idx_competitor_targets_user_id ON public.competitor_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_targets_next_scrape ON public.competitor_targets(next_scrape_at)
  WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_competitor_targets_priority ON public.competitor_targets(priority);

-- RLS policies
ALTER TABLE public.competitor_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their competitor targets"
  ON public.competitor_targets
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all targets"
  ON public.competitor_targets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ====================================================
-- Competitor Scraping Log Table
-- Tracks scraping history and errors
-- ====================================================

CREATE TABLE IF NOT EXISTS public.competitor_scrape_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  target_id UUID NOT NULL,
  property_id UUID NOT NULL,

  -- Scrape details
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,

  -- Results
  status VARCHAR(50) NOT NULL, -- success, partial, failed
  competitors_found INTEGER DEFAULT 0,
  rows_inserted INTEGER DEFAULT 0,
  error_message TEXT,

  -- Performance metrics
  duration_ms INTEGER,
  proxy_used VARCHAR(255),
  user_agent TEXT,

  -- Timestamps
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT competitor_scrape_log_target_id_fkey FOREIGN KEY (target_id)
    REFERENCES public.competitor_targets(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_scrape_log_target_id ON public.competitor_scrape_log(target_id);
CREATE INDEX IF NOT EXISTS idx_competitor_scrape_log_property_id ON public.competitor_scrape_log(property_id);
CREATE INDEX IF NOT EXISTS idx_competitor_scrape_log_status ON public.competitor_scrape_log(status);
CREATE INDEX IF NOT EXISTS idx_competitor_scrape_log_scraped_at ON public.competitor_scrape_log(scraped_at DESC);

-- RLS policies
ALTER TABLE public.competitor_scrape_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their scrape logs"
  ON public.competitor_scrape_log
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE userid = auth.uid()
    )
  );

CREATE POLICY "Service role can manage scrape logs"
  ON public.competitor_scrape_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ====================================================
-- Helper Functions
-- ====================================================

-- Function to get latest competitor prices for a property
CREATE OR REPLACE FUNCTION get_competitor_prices(
  p_property_id UUID,
  p_date DATE
)
RETURNS TABLE(
  date DATE,
  price_p10 DECIMAL,
  price_p50 DECIMAL,
  price_p90 DECIMAL,
  competitor_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.date,
    cd.price_p10,
    cd.price_p50,
    cd.price_p90,
    cd.competitor_count
  FROM public.competitor_daily cd
  WHERE cd.property_id = p_property_id
    AND cd.date = p_date
  ORDER BY cd.scraped_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next scraping targets
CREATE OR REPLACE FUNCTION get_next_scraping_targets(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  target_id UUID,
  property_id UUID,
  user_id UUID,
  location JSONB,
  room_type VARCHAR,
  guests INTEGER,
  search_radius_km INTEGER,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.property_id,
    ct.user_id,
    ct.location,
    ct.room_type,
    ct.guests,
    ct.search_radius_km,
    ct.priority
  FROM public.competitor_targets ct
  WHERE ct.enabled = true
    AND (ct.next_scrape_at IS NULL OR ct.next_scrape_at <= NOW())
  ORDER BY ct.priority ASC, ct.next_scrape_at ASC NULLS FIRST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- Comments for documentation
-- ====================================================

COMMENT ON TABLE public.competitor_daily IS 'Stores daily competitor price bands (P10, P50, P90) for market intelligence';
COMMENT ON TABLE public.competitor_targets IS 'Defines which properties to scrape and their configuration';
COMMENT ON TABLE public.competitor_scrape_log IS 'Tracks scraping history, performance, and errors';

COMMENT ON COLUMN public.competitor_daily.price_p10 IS '10th percentile (low) competitor price';
COMMENT ON COLUMN public.competitor_daily.price_p50 IS '50th percentile (median) competitor price';
COMMENT ON COLUMN public.competitor_daily.price_p90 IS '90th percentile (high) competitor price';
COMMENT ON COLUMN public.competitor_daily.competitor_count IS 'Number of competitors sampled for this date';

-- ====================================================
-- Grant permissions
-- ====================================================

-- Grant access to authenticated users (via RLS)
GRANT SELECT ON public.competitor_daily TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.competitor_targets TO authenticated;
GRANT SELECT ON public.competitor_scrape_log TO authenticated;

-- Service role has full access
GRANT ALL ON public.competitor_daily TO service_role;
GRANT ALL ON public.competitor_targets TO service_role;
GRANT ALL ON public.competitor_scrape_log TO service_role;
