/**
 * Enrichment Cache Tables
 * Task3: Holiday and Weather Caching for Performance
 *
 * Purpose: Cache external API responses to reduce redundant calls and improve performance
 */

-- Holiday Cache Table
-- Stores holiday data by country and date to avoid repeated API calls to Calendarific
CREATE TABLE IF NOT EXISTS public.holiday_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
  date DATE NOT NULL,                -- Holiday date (YYYY-MM-DD)
  holiday_name TEXT NOT NULL,        -- Name of the holiday (e.g., 'Christmas Day')
  holiday_type VARCHAR(50),          -- Type of holiday (e.g., 'National', 'Religious', 'Local')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique index on country + date for fast lookups
  CONSTRAINT holiday_cache_country_date_key UNIQUE(country_code, date)
);

-- Index for fast lookups by country and date range
CREATE INDEX IF NOT EXISTS idx_holiday_cache_country_date
  ON public.holiday_cache(country_code, date);

-- Index for querying by date range
CREATE INDEX IF NOT EXISTS idx_holiday_cache_date
  ON public.holiday_cache(date);

-- Comment
COMMENT ON TABLE public.holiday_cache IS 'Caches holiday data from Calendarific API to reduce external API calls';


-- Weather Cache Table
-- Stores weather data by location (lat/lng rounded to 2 decimals) and date
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(5, 2) NOT NULL,   -- Rounded to 2 decimals for cache hits (~1.1km precision)
  longitude DECIMAL(5, 2) NOT NULL,  -- Rounded to 2 decimals
  date DATE NOT NULL,                 -- Weather date (YYYY-MM-DD)

  -- Weather data from Open-Meteo
  temperature DECIMAL(5, 2),          -- Mean temperature in °C
  temp_min DECIMAL(5, 2),             -- Min temperature in °C
  temp_max DECIMAL(5, 2),             -- Max temperature in °C
  precipitation DECIMAL(6, 2),        -- Precipitation in mm
  weather_code INT,                   -- WMO weather code
  weather_description TEXT,           -- Human-readable description
  sunshine_hours DECIMAL(4, 2),      -- Sunshine duration in hours

  -- API metadata
  api_source VARCHAR(50) DEFAULT 'open-meteo', -- 'open-meteo' or 'openweather'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique index on location + date for fast lookups
  CONSTRAINT weather_cache_location_date_key UNIQUE(latitude, longitude, date)
);

-- Index for fast lookups by location and date range
CREATE INDEX IF NOT EXISTS idx_weather_cache_location_date
  ON public.weather_cache(latitude, longitude, date);

-- Index for querying by date range
CREATE INDEX IF NOT EXISTS idx_weather_cache_date
  ON public.weather_cache(date);

-- Comment
COMMENT ON TABLE public.weather_cache IS 'Caches weather data from Open-Meteo API to reduce external API calls. Lat/Lng rounded to 2 decimals (~1.1km precision) for cache hits.';


-- Row Level Security (RLS) Policies
-- Cache tables are read-only for all authenticated users, writable only by backend service

-- Holiday cache RLS
ALTER TABLE public.holiday_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read holiday cache"
  ON public.holiday_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can write holiday cache"
  ON public.holiday_cache
  FOR ALL
  USING (auth.role() = 'service_role');


-- Weather cache RLS
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weather cache"
  ON public.weather_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can write weather cache"
  ON public.weather_cache
  FOR ALL
  USING (auth.role() = 'service_role');
