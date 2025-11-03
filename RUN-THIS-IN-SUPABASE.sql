-- ============================================
-- CACHE TABLES SETUP
-- Copy this entire file and run in Supabase SQL Editor
-- ============================================

-- Holiday Cache Table
CREATE TABLE IF NOT EXISTS public.holiday_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL,
  date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT holiday_cache_country_date_key UNIQUE(country_code, date)
);

CREATE INDEX IF NOT EXISTS idx_holiday_cache_country_date
  ON public.holiday_cache(country_code, date);

CREATE INDEX IF NOT EXISTS idx_holiday_cache_date
  ON public.holiday_cache(date);

COMMENT ON TABLE public.holiday_cache IS 'Caches holiday data from Calendarific API to reduce external API calls';

-- Weather Cache Table
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(5, 2) NOT NULL,
  longitude DECIMAL(5, 2) NOT NULL,
  date DATE NOT NULL,
  temperature DECIMAL(5, 2),
  temp_min DECIMAL(5, 2),
  temp_max DECIMAL(5, 2),
  precipitation DECIMAL(6, 2),
  weather_code INT,
  weather_description TEXT,
  sunshine_hours DECIMAL(4, 2),
  api_source VARCHAR(50) DEFAULT 'open-meteo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT weather_cache_location_date_key UNIQUE(latitude, longitude, date)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_location_date
  ON public.weather_cache(latitude, longitude, date);

CREATE INDEX IF NOT EXISTS idx_weather_cache_date
  ON public.weather_cache(date);

COMMENT ON TABLE public.weather_cache IS 'Caches weather data from Open-Meteo API to reduce external API calls. Lat/Lng rounded to 2 decimals (~1.1km precision) for cache hits.';

-- Row Level Security (RLS) Policies
ALTER TABLE public.holiday_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read holiday cache" ON public.holiday_cache;
CREATE POLICY "Anyone can read holiday cache"
  ON public.holiday_cache
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can write holiday cache" ON public.holiday_cache;
CREATE POLICY "Service role can write holiday cache"
  ON public.holiday_cache
  FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read weather cache" ON public.weather_cache;
CREATE POLICY "Anyone can read weather cache"
  ON public.weather_cache
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can write weather cache" ON public.weather_cache;
CREATE POLICY "Service role can write weather cache"
  ON public.weather_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Done!
SELECT 'Cache tables created successfully!' as status;
