-- ============================================
-- UNIVERSAL CAMPSITE SCHEMA - Complete Migration
-- ============================================
-- Created: 2025-10-25
-- Purpose: Flexible, universal schema for any campsite's pricing data
-- Features:
--   - User-defined accommodation types
--   - Flexible pricing structure (JSONB)
--   - Proper enrichment correlation (one record per date/location)
--   - Support for ANY CSV data format
--   - Multi-tenant SaaS ready

-- ============================================
-- STEP 1: Core Tables
-- ============================================

-- Properties Table (Campsites)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  property_type TEXT DEFAULT 'campsite',

  -- Location (REQUIRED for enrichment)
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timezone TEXT DEFAULT 'Europe/Paris',

  -- Property stats
  total_units INTEGER,
  total_pitches INTEGER,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),

  -- Configuration (flexible)
  default_currency TEXT DEFAULT 'EUR',
  config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(user_id, is_active);

-- ============================================
-- STEP 2: Accommodation Types (User-Defined)
-- ============================================

CREATE TABLE IF NOT EXISTS accommodation_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,

  -- Basic info (USER DEFINES THESE!)
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,

  -- Capacity
  capacity_people INTEGER,
  capacity_adults INTEGER,
  capacity_children INTEGER,
  bedrooms INTEGER,

  -- Physical attributes
  size_sqm DECIMAL(10, 2),
  surface_type TEXT,

  -- Flexible attributes (ANY custom fields)
  attributes JSONB DEFAULT '{}',

  -- Pricing defaults
  default_min_stay INTEGER DEFAULT 1,
  default_price DECIMAL(10, 2),

  -- Status
  total_units INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(property_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accommodation_types_property ON accommodation_types(property_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_types_category ON accommodation_types(property_id, category);
CREATE INDEX IF NOT EXISTS idx_accommodation_types_active ON accommodation_types(property_id, is_active);

-- ============================================
-- STEP 3: Seasonal Periods (User-Defined)
-- ============================================

CREATE TABLE IF NOT EXISTS seasonal_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,

  -- Season definition
  name TEXT NOT NULL,
  code TEXT,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Pricing modifiers
  rate_multiplier DECIMAL(5, 2) DEFAULT 1.00,
  default_min_stay INTEGER DEFAULT 1,

  -- Flexible attributes
  attributes JSONB DEFAULT '{}',

  -- Priority for overlapping seasons
  priority INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_seasonal_periods_property ON seasonal_periods(property_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_periods_dates ON seasonal_periods(property_id, start_date, end_date);

-- ============================================
-- STEP 4: Enrichment Data (SHARED!)
-- ============================================
-- ONE RECORD PER DATE PER LOCATION
-- Shared across all properties in same area

CREATE TABLE IF NOT EXISTS enrichment_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Location (rounded for clustering)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_hash TEXT GENERATED ALWAYS AS (
    ROUND(latitude::numeric, 2)::text || ',' || ROUND(longitude::numeric, 2)::text
  ) STORED,

  -- Date (the key!)
  date DATE NOT NULL,

  -- Weather data
  temperature DECIMAL(5, 2),
  temperature_min DECIMAL(5, 2),
  temperature_max DECIMAL(5, 2),
  feels_like DECIMAL(5, 2),
  precipitation DECIMAL(6, 2),
  rain DECIMAL(6, 2),
  snow DECIMAL(6, 2),
  humidity INTEGER,
  wind_speed DECIMAL(5, 2),
  wind_direction INTEGER,
  cloud_cover INTEGER,
  sunshine_hours DECIMAL(5, 2),
  uv_index DECIMAL(3, 1),
  weather_code INTEGER,
  weather_condition TEXT,
  weather_description TEXT,

  -- Holiday data
  is_holiday BOOLEAN DEFAULT FALSE,
  holiday_name TEXT,
  holiday_type TEXT,
  holiday_country TEXT,
  is_school_holiday BOOLEAN DEFAULT FALSE,
  school_holiday_zone TEXT,

  -- Temporal features (auto-computed)
  day_of_week INTEGER,
  day_name TEXT,
  week_of_year INTEGER,
  month INTEGER,
  month_name TEXT,
  quarter INTEGER,
  year INTEGER,
  is_weekend BOOLEAN,
  is_long_weekend BOOLEAN,
  season TEXT,

  -- Local events (future)
  local_events JSONB DEFAULT '[]',

  -- Data quality
  enrichment_status TEXT DEFAULT 'pending',
  enriched_at TIMESTAMP WITH TIME ZONE,
  enrichment_sources JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(location_hash, date)
);

-- CRITICAL INDEXES for joins
CREATE INDEX IF NOT EXISTS idx_enrichment_location_date ON enrichment_data(location_hash, date);
CREATE INDEX IF NOT EXISTS idx_enrichment_date ON enrichment_data(date);
CREATE INDEX IF NOT EXISTS idx_enrichment_location ON enrichment_data(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_enrichment_status ON enrichment_data(enrichment_status);

-- GiST index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_enrichment_location_gist ON enrichment_data
  USING GIST (point(longitude, latitude));

-- ============================================
-- STEP 5: Daily Pricing (Core Table)
-- ============================================
-- Flexible pricing data with enrichment correlation

CREATE TABLE IF NOT EXISTS daily_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  accommodation_type_id UUID REFERENCES accommodation_types(id) ON DELETE CASCADE NOT NULL,

  -- Date (the key!)
  date DATE NOT NULL,

  -- Pricing (flexible)
  price DECIMAL(10, 2),
  pricing_data JSONB DEFAULT '{}',

  -- Availability & bookings
  availability_status TEXT DEFAULT 'available',
  bookings_count INTEGER DEFAULT 0,
  occupancy_rate DECIMAL(5, 2),

  -- Booking details (flexible)
  booking_data JSONB DEFAULT '{}',

  -- Season reference
  season_id UUID REFERENCES seasonal_periods(id) ON DELETE SET NULL,
  season_name TEXT,

  -- Minimum stay
  min_stay_nights INTEGER DEFAULT 1,

  -- Revenue metrics
  revenue DECIMAL(10, 2),
  adr DECIMAL(10, 2),

  -- ENRICHMENT CORRELATION (KEY!)
  enrichment_date DATE NOT NULL,

  -- Import metadata
  source TEXT DEFAULT 'csv_upload',
  source_file_id UUID,
  import_batch_id UUID,

  -- Custom fields (ANY extra CSV columns)
  custom_data JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(property_id, accommodation_type_id, date),
  CONSTRAINT valid_occupancy CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100)
);

-- CRITICAL INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_daily_pricing_property_date ON daily_pricing(property_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_pricing_accommodation ON daily_pricing(accommodation_type_id);
CREATE INDEX IF NOT EXISTS idx_daily_pricing_enrichment ON daily_pricing(enrichment_date);
CREATE INDEX IF NOT EXISTS idx_daily_pricing_season ON daily_pricing(season_id);
CREATE INDEX IF NOT EXISTS idx_daily_pricing_availability ON daily_pricing(property_id, availability_status, date);

-- Partial index for occupied dates
CREATE INDEX IF NOT EXISTS idx_daily_pricing_occupied ON daily_pricing(property_id, date)
  WHERE availability_status = 'occupied';

-- ============================================
-- STEP 6: Source Files (Track Uploads)
-- ============================================

CREATE TABLE IF NOT EXISTS source_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- File info
  original_filename TEXT NOT NULL,
  file_size BIGINT,
  file_hash TEXT,

  -- Data info
  total_rows INTEGER,
  imported_rows INTEGER,
  failed_rows INTEGER,
  date_range_start DATE,
  date_range_end DATE,

  -- Column mapping (stores how CSV columns mapped)
  column_mapping JSONB DEFAULT '{}',

  -- Import status
  import_status TEXT DEFAULT 'pending',
  import_batch_id UUID,
  error_log JSONB DEFAULT '[]',

  -- Enrichment trigger
  enrichment_queued BOOLEAN DEFAULT FALSE,
  enrichment_completed BOOLEAN DEFAULT FALSE,

  -- Metadata
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_row_counts CHECK (
    imported_rows <= total_rows AND
    failed_rows <= total_rows
  )
);

CREATE INDEX IF NOT EXISTS idx_source_files_property ON source_files(property_id);
CREATE INDEX IF NOT EXISTS idx_source_files_user ON source_files(user_id);
CREATE INDEX IF NOT EXISTS idx_source_files_status ON source_files(import_status);
CREATE INDEX IF NOT EXISTS idx_source_files_batch ON source_files(import_batch_id);

-- ============================================
-- STEP 7: Update Existing Competitors Table
-- ============================================
-- Add property_id reference and enrichment correlation

ALTER TABLE IF EXISTS competitors
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- Backfill property_id from user_id (assumes one property per user initially)
-- UPDATE competitors c
-- SET property_id = (SELECT id FROM properties WHERE user_id = c.user_id LIMIT 1)
-- WHERE property_id IS NULL;

-- Update competitor_pricing to reference enrichment
ALTER TABLE IF EXISTS competitor_pricing
  ADD COLUMN IF NOT EXISTS enrichment_date DATE;

-- Backfill enrichment_date = date
UPDATE competitor_pricing
SET enrichment_date = date
WHERE enrichment_date IS NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_enrichment ON competitor_pricing(enrichment_date);

-- ============================================
-- STEP 8: Row-Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_data ENABLE ROW LEVEL SECURITY;

-- Properties: Users can only see their own
CREATE POLICY IF NOT EXISTS "Users can view their own properties"
  ON properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id);

-- Accommodation Types: Users can only manage types for their properties
CREATE POLICY IF NOT EXISTS "Users can view their accommodation types"
  ON accommodation_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = accommodation_types.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert their accommodation types"
  ON accommodation_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = accommodation_types.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update their accommodation types"
  ON accommodation_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = accommodation_types.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can delete their accommodation types"
  ON accommodation_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = accommodation_types.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Seasonal Periods: Similar to accommodation types
CREATE POLICY IF NOT EXISTS "Users can view their seasonal periods"
  ON seasonal_periods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = seasonal_periods.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage their seasonal periods"
  ON seasonal_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = seasonal_periods.property_id
      AND properties.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = seasonal_periods.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Daily Pricing: Users can only see pricing for their properties
CREATE POLICY IF NOT EXISTS "Users can view their daily pricing"
  ON daily_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = daily_pricing.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Service role can manage all pricing"
  ON daily_pricing FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Source Files: Users can only see their own uploads
CREATE POLICY IF NOT EXISTS "Users can view their own source files"
  ON source_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage all source files"
  ON source_files FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Enrichment Data: Public read (shared resource), service role write
CREATE POLICY IF NOT EXISTS "Anyone can read enrichment data"
  ON enrichment_data FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage enrichment data"
  ON enrichment_data FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- STEP 9: Helper Functions
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accommodation_types_updated_at ON accommodation_types;
CREATE TRIGGER update_accommodation_types_updated_at
  BEFORE UPDATE ON accommodation_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_pricing_updated_at ON daily_pricing;
CREATE TRIGGER update_daily_pricing_updated_at
  BEFORE UPDATE ON daily_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enrichment_data_updated_at ON enrichment_data;
CREATE TRIGGER update_enrichment_data_updated_at
  BEFORE UPDATE ON enrichment_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically populate temporal fields in enrichment_data
CREATE OR REPLACE FUNCTION populate_enrichment_temporal_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically compute temporal features
  NEW.day_of_week := EXTRACT(ISODOW FROM NEW.date) - 1; -- 0 = Monday
  NEW.day_name := TO_CHAR(NEW.date, 'Day');
  NEW.week_of_year := EXTRACT(WEEK FROM NEW.date);
  NEW.month := EXTRACT(MONTH FROM NEW.date);
  NEW.month_name := TO_CHAR(NEW.date, 'Month');
  NEW.quarter := EXTRACT(QUARTER FROM NEW.date);
  NEW.year := EXTRACT(YEAR FROM NEW.date);
  NEW.is_weekend := (EXTRACT(ISODOW FROM NEW.date) IN (6, 7));

  -- Determine meteorological season (Northern Hemisphere)
  NEW.season := CASE
    WHEN EXTRACT(MONTH FROM NEW.date) IN (12, 1, 2) THEN 'winter'
    WHEN EXTRACT(MONTH FROM NEW.date) IN (3, 4, 5) THEN 'spring'
    WHEN EXTRACT(MONTH FROM NEW.date) IN (6, 7, 8) THEN 'summer'
    ELSE 'autumn'
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for enrichment temporal fields
DROP TRIGGER IF EXISTS populate_enrichment_temporal ON enrichment_data;
CREATE TRIGGER populate_enrichment_temporal
  BEFORE INSERT OR UPDATE ON enrichment_data
  FOR EACH ROW
  EXECUTE FUNCTION populate_enrichment_temporal_fields();

-- ============================================
-- STEP 10: Helpful Views
-- ============================================

-- View: Property overview with stats
CREATE OR REPLACE VIEW property_overview AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.city,
  p.region,
  p.latitude,
  p.longitude,
  p.total_units,
  p.star_rating,
  p.is_active,
  COUNT(DISTINCT at.id) as accommodation_types_count,
  COUNT(DISTINCT sp.id) as seasonal_periods_count,
  COUNT(DISTINCT dp.id) as pricing_records_count,
  MIN(dp.date) as earliest_data_date,
  MAX(dp.date) as latest_data_date,
  p.created_at
FROM properties p
LEFT JOIN accommodation_types at ON at.property_id = p.id
LEFT JOIN seasonal_periods sp ON sp.property_id = p.id
LEFT JOIN daily_pricing dp ON dp.property_id = p.id
GROUP BY p.id;

-- View: Pricing data with enrichment (for easy queries)
CREATE OR REPLACE VIEW daily_pricing_enriched AS
SELECT
  dp.*,
  at.name as accommodation_name,
  at.category as accommodation_category,
  p.name as property_name,
  p.latitude as property_latitude,
  p.longitude as property_longitude,
  e.temperature,
  e.precipitation,
  e.weather_condition,
  e.weather_description,
  e.is_holiday,
  e.holiday_name,
  e.is_weekend,
  e.season as meteorological_season
FROM daily_pricing dp
JOIN accommodation_types at ON at.id = dp.accommodation_type_id
JOIN properties p ON p.id = dp.property_id
LEFT JOIN enrichment_data e ON
  dp.enrichment_date = e.date AND
  e.location_hash = (
    ROUND(p.latitude::numeric, 2)::text || ',' || ROUND(p.longitude::numeric, 2)::text
  );

-- ============================================
-- STEP 11: Sample Data (Optional)
-- ============================================

-- Commented out - uncomment to insert sample data for testing

/*
-- Sample Property
INSERT INTO properties (user_id, name, latitude, longitude, city, region, country, total_units, star_rating)
VALUES (
  auth.uid(), -- Replace with actual user ID
  'Camping Les Pins',
  43.296482,
  5.374658,
  'Saint-Cyr-sur-Mer',
  'Provence-Alpes-Côte d''Azur',
  'France',
  150,
  4
)
RETURNING id; -- Save this ID

-- Sample Accommodation Types (use property ID from above)
INSERT INTO accommodation_types (property_id, name, code, category, capacity_people, default_price)
VALUES
  ('property-id-here', 'Luxury Mobile Home', 'LUX-MH', 'mobile_home', 6, 180.00),
  ('property-id-here', 'Standard Mobile Home', 'STD-MH', 'mobile_home', 4, 120.00),
  ('property-id-here', 'Premium Pitch', 'PREM-PITCH', 'pitch', 6, 45.00),
  ('property-id-here', 'Standard Pitch', 'STD-PITCH', 'pitch', 6, 30.00);

-- Sample Seasonal Periods
INSERT INTO seasonal_periods (property_id, name, code, start_date, end_date, rate_multiplier, default_min_stay)
VALUES
  ('property-id-here', 'Peak Season', 'PEAK', '2024-07-01', '2024-08-31', 1.00, 7),
  ('property-id-here', 'High Season', 'HIGH', '2024-06-01', '2024-06-30', 0.85, 4),
  ('property-id-here', 'Shoulder', 'SHOULDER', '2024-05-01', '2024-05-31', 0.70, 3),
  ('property-id-here', 'Off Season', 'OFF', '2024-04-01', '2024-04-30', 0.50, 1);
*/

-- ============================================
-- Migration Complete!
-- ============================================

-- To use this schema:
-- 1. Run this SQL file in your Supabase SQL editor
-- 2. Generate TypeScript types: npx supabase gen types typescript > backend/types/database.types.ts
-- 3. Update backend services to use new schema
-- 4. Update frontend to use new data structure

-- For data migration from old schema:
-- See: docs/developer/DATA_MIGRATION_GUIDE.md
