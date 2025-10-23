-- ====================================================
-- Competitor Graph & Neighborhood Index Tables
-- Task 15: Competitor Graph & Neighborhood Index
-- ====================================================

-- ====================================================
-- Competitor Hotels Table
-- Stores detailed information about competitor hotels
-- ====================================================

CREATE TABLE IF NOT EXISTS public.competitor_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hotel identification
  name VARCHAR(255) NOT NULL,
  external_id VARCHAR(255), -- ID from scraping source (e.g., Booking.com ID)
  source VARCHAR(100) NOT NULL DEFAULT 'makcorps', -- Source of data

  -- Location
  location JSONB NOT NULL, -- { latitude, longitude, city, country, address }

  -- Hotel attributes for similarity scoring
  star_rating DECIMAL(2, 1), -- 1.0 to 5.0
  review_score DECIMAL(3, 1), -- 0.0 to 10.0
  review_count INTEGER DEFAULT 0,

  -- Amenities vector for similarity calculation
  amenities JSONB, -- Array of amenity names
  amenity_vector JSONB, -- Normalized feature vector for similarity

  -- Property type
  property_type VARCHAR(100), -- hotel, apartment, villa, etc.

  -- Metadata
  description TEXT,
  image_urls JSONB, -- Array of image URLs

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Last time seen in scraping

  -- Constraints
  CONSTRAINT competitor_hotels_star_rating_range CHECK (star_rating >= 0 AND star_rating <= 5),
  CONSTRAINT competitor_hotels_review_score_range CHECK (review_score >= 0 AND review_score <= 10)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_hotels_location ON public.competitor_hotels USING GIST ((location::jsonb));
CREATE INDEX IF NOT EXISTS idx_competitor_hotels_star_rating ON public.competitor_hotels(star_rating);
CREATE INDEX IF NOT EXISTS idx_competitor_hotels_review_score ON public.competitor_hotels(review_score);
CREATE INDEX IF NOT EXISTS idx_competitor_hotels_source ON public.competitor_hotels(source);
CREATE INDEX IF NOT EXISTS idx_competitor_hotels_external_id ON public.competitor_hotels(external_id);
CREATE INDEX IF NOT EXISTS idx_competitor_hotels_last_seen ON public.competitor_hotels(last_seen_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_competitor_hotels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competitor_hotels_updated_at_trigger
  BEFORE UPDATE ON public.competitor_hotels
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_hotels_updated_at();

-- ====================================================
-- Competitor Relationships (Graph Edges)
-- Stores similarity relationships between properties and competitors
-- ====================================================

CREATE TABLE IF NOT EXISTS public.competitor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property reference (our user's property)
  property_id UUID NOT NULL,

  -- Competitor hotel reference
  competitor_hotel_id UUID NOT NULL,

  -- Similarity scores (0.0 to 1.0)
  geo_similarity DECIMAL(5, 4) NOT NULL DEFAULT 0, -- Based on distance
  amenity_similarity DECIMAL(5, 4) NOT NULL DEFAULT 0, -- Based on amenities
  review_similarity DECIMAL(5, 4) NOT NULL DEFAULT 0, -- Based on reviews
  overall_similarity DECIMAL(5, 4) NOT NULL, -- Weighted average

  -- Distance
  distance_km DECIMAL(8, 2), -- Distance in kilometers

  -- Ranking
  similarity_rank INTEGER, -- Rank by similarity (1 = most similar)

  -- Weights used for calculation
  weights JSONB, -- { geo: 0.4, amenity: 0.3, review: 0.3 }

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When similarity was last computed

  -- Constraints
  CONSTRAINT competitor_relationships_property_competitor_key UNIQUE(property_id, competitor_hotel_id),
  CONSTRAINT competitor_relationships_geo_similarity_range CHECK (geo_similarity >= 0 AND geo_similarity <= 1),
  CONSTRAINT competitor_relationships_amenity_similarity_range CHECK (amenity_similarity >= 0 AND amenity_similarity <= 1),
  CONSTRAINT competitor_relationships_review_similarity_range CHECK (review_similarity >= 0 AND review_similarity <= 1),
  CONSTRAINT competitor_relationships_overall_similarity_range CHECK (overall_similarity >= 0 AND overall_similarity <= 1),

  -- Foreign keys
  CONSTRAINT competitor_relationships_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT competitor_relationships_competitor_hotel_id_fkey FOREIGN KEY (competitor_hotel_id)
    REFERENCES public.competitor_hotels(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_relationships_property_id ON public.competitor_relationships(property_id);
CREATE INDEX IF NOT EXISTS idx_competitor_relationships_competitor_hotel_id ON public.competitor_relationships(competitor_hotel_id);
CREATE INDEX IF NOT EXISTS idx_competitor_relationships_similarity ON public.competitor_relationships(property_id, overall_similarity DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_relationships_rank ON public.competitor_relationships(property_id, similarity_rank ASC);
CREATE INDEX IF NOT EXISTS idx_competitor_relationships_computed_at ON public.competitor_relationships(computed_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_competitor_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competitor_relationships_updated_at_trigger
  BEFORE UPDATE ON public.competitor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_relationships_updated_at();

-- ====================================================
-- Neighborhood Competitive Index
-- Daily index showing competitive positioning
-- ====================================================

CREATE TABLE IF NOT EXISTS public.neighborhood_competitive_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property reference
  property_id UUID NOT NULL,

  -- Date for index
  date DATE NOT NULL,

  -- Index scores (0-100)
  price_competitiveness_score DECIMAL(5, 2) NOT NULL, -- How competitive our price is (higher = more competitive/lower price)
  value_score DECIMAL(5, 2) NOT NULL, -- Price vs quality (reviews/amenities)
  positioning_score DECIMAL(5, 2) NOT NULL, -- Overall market position
  overall_index DECIMAL(5, 2) NOT NULL, -- Composite index (0-100)

  -- Comparative metrics
  property_price DECIMAL(10, 2), -- Our property's price
  neighborhood_median_price DECIMAL(10, 2), -- Median competitor price
  price_percentile DECIMAL(5, 2), -- Where we fall in price distribution (0-100)

  -- Market context
  competitors_analyzed INTEGER NOT NULL DEFAULT 0, -- Number of competitors in analysis
  avg_competitor_rating DECIMAL(3, 1), -- Average review score of competitors
  property_rating DECIMAL(3, 1), -- Our property's review score

  -- Trend indicators
  index_change_1d DECIMAL(6, 2), -- Change from yesterday
  index_change_7d DECIMAL(6, 2), -- Change from 7 days ago
  index_change_30d DECIMAL(6, 2), -- Change from 30 days ago

  -- Insights
  market_position VARCHAR(50), -- 'premium', 'mid-market', 'budget', 'ultra-premium'
  competitive_advantage JSONB, -- Array of advantages (e.g., ['lower_price', 'better_reviews'])
  competitive_weakness JSONB, -- Array of weaknesses

  -- Computation metadata
  algorithm_version VARCHAR(20) DEFAULT '1.0',
  weights JSONB, -- Weights used in calculation

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT neighborhood_competitive_index_property_date_key UNIQUE(property_id, date),
  CONSTRAINT neighborhood_competitive_index_price_comp_range CHECK (price_competitiveness_score >= 0 AND price_competitiveness_score <= 100),
  CONSTRAINT neighborhood_competitive_index_value_range CHECK (value_score >= 0 AND value_score <= 100),
  CONSTRAINT neighborhood_competitive_index_positioning_range CHECK (positioning_score >= 0 AND positioning_score <= 100),
  CONSTRAINT neighborhood_competitive_index_overall_range CHECK (overall_index >= 0 AND overall_index <= 100),

  -- Foreign key
  CONSTRAINT neighborhood_competitive_index_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_neighborhood_index_property_id ON public.neighborhood_competitive_index(property_id);
CREATE INDEX IF NOT EXISTS idx_neighborhood_index_date ON public.neighborhood_competitive_index(date DESC);
CREATE INDEX IF NOT EXISTS idx_neighborhood_index_property_date ON public.neighborhood_competitive_index(property_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_neighborhood_index_overall ON public.neighborhood_competitive_index(overall_index DESC);
CREATE INDEX IF NOT EXISTS idx_neighborhood_index_computed_at ON public.neighborhood_competitive_index(computed_at DESC);

-- ====================================================
-- RLS Policies
-- ====================================================

-- Competitor Hotels: Read-only for authenticated users
ALTER TABLE public.competitor_hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read competitor hotels"
  ON public.competitor_hotels
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage competitor hotels"
  ON public.competitor_hotels
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Competitor Relationships: Users can read their property's relationships
ALTER TABLE public.competitor_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their property relationships"
  ON public.competitor_relationships
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE userid = auth.uid()
    )
  );

CREATE POLICY "Service role can manage relationships"
  ON public.competitor_relationships
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Neighborhood Competitive Index: Users can read their property's index
ALTER TABLE public.neighborhood_competitive_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their property index"
  ON public.neighborhood_competitive_index
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE userid = auth.uid()
    )
  );

CREATE POLICY "Service role can manage index"
  ON public.neighborhood_competitive_index
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ====================================================
-- Helper Functions
-- ====================================================

-- Calculate Haversine distance between two points
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371.0; -- km
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get latest neighborhood index for a property
CREATE OR REPLACE FUNCTION get_latest_neighborhood_index(
  p_property_id UUID
)
RETURNS TABLE(
  date DATE,
  overall_index DECIMAL,
  price_competitiveness_score DECIMAL,
  value_score DECIMAL,
  positioning_score DECIMAL,
  market_position VARCHAR,
  index_change_1d DECIMAL,
  index_change_7d DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nci.date,
    nci.overall_index,
    nci.price_competitiveness_score,
    nci.value_score,
    nci.positioning_score,
    nci.market_position,
    nci.index_change_1d,
    nci.index_change_7d
  FROM public.neighborhood_competitive_index nci
  WHERE nci.property_id = p_property_id
  ORDER BY nci.date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get neighborhood index trend
CREATE OR REPLACE FUNCTION get_neighborhood_index_trend(
  p_property_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  date DATE,
  overall_index DECIMAL,
  price_competitiveness_score DECIMAL,
  competitors_analyzed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nci.date,
    nci.overall_index,
    nci.price_competitiveness_score,
    nci.competitors_analyzed
  FROM public.neighborhood_competitive_index nci
  WHERE nci.property_id = p_property_id
    AND nci.date >= CURRENT_DATE - p_days
  ORDER BY nci.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top similar competitors
CREATE OR REPLACE FUNCTION get_top_competitors(
  p_property_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  competitor_hotel_id UUID,
  hotel_name VARCHAR,
  overall_similarity DECIMAL,
  distance_km DECIMAL,
  review_score DECIMAL,
  star_rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.competitor_hotel_id,
    ch.name,
    cr.overall_similarity,
    cr.distance_km,
    ch.review_score,
    ch.star_rating
  FROM public.competitor_relationships cr
  JOIN public.competitor_hotels ch ON cr.competitor_hotel_id = ch.id
  WHERE cr.property_id = p_property_id
  ORDER BY cr.overall_similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- Comments
-- ====================================================

COMMENT ON TABLE public.competitor_hotels IS 'Detailed information about competitor hotels discovered through scraping';
COMMENT ON TABLE public.competitor_relationships IS 'Similarity graph edges between properties and competitors';
COMMENT ON TABLE public.neighborhood_competitive_index IS 'Daily competitive positioning index per property';

COMMENT ON COLUMN public.competitor_relationships.geo_similarity IS 'Geographic proximity score (0-1, based on distance)';
COMMENT ON COLUMN public.competitor_relationships.amenity_similarity IS 'Amenity overlap score (0-1, based on feature vectors)';
COMMENT ON COLUMN public.competitor_relationships.review_similarity IS 'Review quality similarity (0-1, based on ratings)';
COMMENT ON COLUMN public.competitor_relationships.overall_similarity IS 'Weighted overall similarity score';

COMMENT ON COLUMN public.neighborhood_competitive_index.overall_index IS 'Composite competitive index (0-100, higher = more competitive position)';
COMMENT ON COLUMN public.neighborhood_competitive_index.price_competitiveness_score IS 'Price competitiveness (0-100, higher = more aggressive pricing)';
COMMENT ON COLUMN public.neighborhood_competitive_index.value_score IS 'Value proposition score (price vs quality)';

-- ====================================================
-- Grant Permissions
-- ====================================================

GRANT SELECT ON public.competitor_hotels TO authenticated;
GRANT SELECT ON public.competitor_relationships TO authenticated;
GRANT SELECT ON public.neighborhood_competitive_index TO authenticated;

GRANT ALL ON public.competitor_hotels TO service_role;
GRANT ALL ON public.competitor_relationships TO service_role;
GRANT ALL ON public.neighborhood_competitive_index TO service_role;
