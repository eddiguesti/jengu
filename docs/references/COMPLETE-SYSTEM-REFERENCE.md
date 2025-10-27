# JENGU PLATFORM - COMPLETE SYSTEM REFERENCE FOR LLM

**Purpose**: This document contains EVERYTHING an LLM needs to fully understand and work with the Jengu codebase.

**Last Updated**: October 24, 2025
**Codebase Size**: 186 files (80 backend .ts, 90 frontend .tsx/.ts, 16 pricing-service .py)
**Lines of Code**: ~25,000 lines
**Status**: Production-ready (18/18 tasks complete, 100% feature coverage)

---

## QUICK NAVIGATION

- [TECHNICAL-ARCHITECTURE.md](developer/TECHNICAL-ARCHITECTURE.md) - Deep-dive architecture (115k tokens)
- [DATABASE-SCHEMA.md](#database-schema) - All tables, columns, relationships
- [API-REFERENCE.md](#api-reference) - All 70+ endpoints with examples
- [FILE-STRUCTURE.md](#file-structure) - Complete directory tree
- [ENVIRONMENT-VARIABLES.md](#environment-variables) - All env vars explained
- [DATA-FLOWS.md](#data-flows) - Step-by-step user journeys
- [INTEGRATION-POINTS.md](#integration-points) - How services connect

---

## DATABASE SCHEMA

### Overview

**Database**: PostgreSQL 15 (via Supabase)
**Total Tables**: 17 tables
**Partitioning**: `pricing_data` partitioned by month
**Indexing**: 25+ indexes for performance
**RLS**: Enabled on all user-facing tables

### Core Tables

#### 1. `auth.users` (Supabase Auth - Managed)

```sql
-- Managed by Supabase Auth, not directly modified
id UUID PRIMARY KEY
email TEXT UNIQUE
encrypted_password TEXT
email_confirmed_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
last_sign_in_at TIMESTAMPTZ
```

#### 2. `public.properties`

```sql
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  fileName TEXT NOT NULL,
  fileSize INTEGER,
  rowCount INTEGER DEFAULT 0,
  columnCount INTEGER DEFAULT 0,

  -- Upload tracking
  uploadedAt TIMESTAMPTZ DEFAULT NOW(),
  lastAccessedAt TIMESTAMPTZ,

  -- Enrichment status (Task 3)
  enrichmentStatus TEXT CHECK (enrichmentStatus IN ('none', 'pending', 'completed', 'failed')),
  enrichedAt TIMESTAMPTZ,
  enrichmentError TEXT,

  -- Metadata
  sourceType TEXT DEFAULT 'csv_upload',
  dataQualityScore DECIMAL(3, 2),  -- 0.00 to 1.00

  CONSTRAINT properties_userId_fileName_key UNIQUE(userId, fileName)
);

-- Indexes
CREATE INDEX idx_properties_userId ON public.properties(userId);
CREATE INDEX idx_properties_uploadedAt ON public.properties(uploadedAt DESC);
CREATE INDEX idx_properties_enrichmentStatus ON public.properties(enrichmentStatus)
  WHERE enrichmentStatus IN ('pending', 'failed');

-- RLS Policies
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own properties"
  ON public.properties FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert own properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update own properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() = userId);

CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE
  USING (auth.uid() = userId);
```

#### 3. `public.pricing_data` (Partitioned)

```sql
CREATE TABLE public.pricing_data (
  id UUID DEFAULT gen_random_uuid(),
  propertyId UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core pricing fields
  date DATE NOT NULL,
  price DECIMAL(10, 2),
  occupancy DECIMAL(5, 4),  -- 0.0000 to 1.0000
  revenue DECIMAL(10, 2),

  -- Product details
  productType TEXT,
  refundable BOOLEAN DEFAULT false,
  lengthOfStay INTEGER,

  -- Temporal features (auto-enriched)
  dayOfWeek INTEGER,  -- 0=Sunday, 6=Saturday
  month INTEGER,
  season TEXT CHECK (season IN ('Spring', 'Summer', 'Fall', 'Winter')),
  isWeekend BOOLEAN,

  -- Weather features (enriched from Open-Meteo)
  temperature DECIMAL(5, 2),
  tempMin DECIMAL(5, 2),
  tempMax DECIMAL(5, 2),
  precipitation DECIMAL(6, 2),
  weatherCode INTEGER,
  weatherDescription TEXT,

  -- Holiday features (enriched from Calendarific)
  isHoliday BOOLEAN DEFAULT false,
  holidayName TEXT,

  -- Competitor features
  competitorPriceP10 DECIMAL(10, 2),
  competitorPriceP50 DECIMAL(10, 2),
  competitorPriceP90 DECIMAL(10, 2),

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (id, date)  -- Composite key for partitioning
) PARTITION BY RANGE (date);

-- Create partitions (automated via cron)
-- Example: pricing_data_2025_01, pricing_data_2025_02, etc.
CREATE TABLE pricing_data_2025_01 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes (created on each partition)
CREATE INDEX idx_pricing_data_propertyId_date
  ON public.pricing_data(propertyId, date);
CREATE INDEX idx_pricing_data_userId
  ON public.pricing_data(userId);
CREATE INDEX idx_pricing_data_date
  ON public.pricing_data(date DESC);

-- RLS Policies
ALTER TABLE public.pricing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pricing data"
  ON public.pricing_data FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert own pricing data"
  ON public.pricing_data FOR INSERT
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update own pricing data"
  ON public.pricing_data FOR UPDATE
  USING (auth.uid() = userId);
```

#### 4. `public.business_settings`

```sql
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business info
  businessName TEXT,
  propertyType TEXT CHECK (propertyType IN ('hotel', 'resort', 'vacation_rental', 'hostel', 'other')),

  -- Location
  location JSONB,  -- {city, country, latitude, longitude}
  timezone TEXT DEFAULT 'UTC',

  -- Financial
  currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD', 'AED')),

  -- Capacity configuration
  totalRooms INTEGER,
  totalCapacity INTEGER,

  -- Pricing strategy defaults
  minPrice DECIMAL(10, 2),
  maxPrice DECIMAL(10, 2),
  defaultStrategy TEXT DEFAULT 'balanced' CHECK (defaultStrategy IN ('aggressive', 'balanced', 'conservative')),

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_settings_userId ON public.business_settings(userId);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.business_settings FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can update own settings"
  ON public.business_settings FOR ALL
  USING (auth.uid() = userId);
```

#### 5. `public.weather_cache` (Task 3)

```sql
CREATE TABLE public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location (rounded to 2 decimals for ~1.1km precision cache hits)
  latitude DECIMAL(5, 2) NOT NULL,
  longitude DECIMAL(5, 2) NOT NULL,
  date DATE NOT NULL,

  -- Weather data
  temperature DECIMAL(5, 2),
  tempMin DECIMAL(5, 2),
  tempMax DECIMAL(5, 2),
  precipitation DECIMAL(6, 2),
  weatherCode INTEGER,
  weatherDescription TEXT,
  sunshineHours DECIMAL(4, 2),

  -- Metadata
  apiSource VARCHAR(50) DEFAULT 'open-meteo',
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT weather_cache_location_date_key UNIQUE(latitude, longitude, date)
);

CREATE INDEX idx_weather_cache_location_date
  ON public.weather_cache(latitude, longitude, date);
CREATE INDEX idx_weather_cache_date
  ON public.weather_cache(date);

-- RLS: Read-only for all authenticated, write by service role only
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weather cache"
  ON public.weather_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role can write weather cache"
  ON public.weather_cache FOR ALL
  USING (auth.role() = 'service_role');
```

#### 6. `public.holiday_cache` (Task 3)

```sql
CREATE TABLE public.holiday_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  countryCode VARCHAR(2) NOT NULL,  -- ISO 3166-1 alpha-2
  date DATE NOT NULL,
  holidayName TEXT NOT NULL,
  holidayType VARCHAR(50),  -- 'National', 'Religious', 'Local'

  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT holiday_cache_country_date_key UNIQUE(countryCode, date)
);

CREATE INDEX idx_holiday_cache_country_date
  ON public.holiday_cache(countryCode, date);
CREATE INDEX idx_holiday_cache_date
  ON public.holiday_cache(date);

-- RLS: Same as weather_cache
ALTER TABLE public.holiday_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read holiday cache"
  ON public.holiday_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role can write holiday cache"
  ON public.holiday_cache FOR ALL
  USING (auth.role() = 'service_role');
```

#### 7. `public.competitor_data` (Task 7)

```sql
CREATE TABLE public.competitor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propertyId UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Individual competitor record
  competitorHotelId TEXT,
  hotelName TEXT,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'EUR',
  rating DECIMAL(3, 1),
  distance DECIMAL(6, 2),  -- km from property
  roomType TEXT,
  available BOOLEAN,
  url TEXT,

  -- Percentiles (aggregated if multiple competitors)
  priceP10 DECIMAL(10, 2),
  priceP50 DECIMAL(10, 2),
  priceP90 DECIMAL(10, 2),
  competitorCount INTEGER,

  -- Scraping metadata
  scrapedAt TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'playwright_scraper',

  createdAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competitor_data_propertyId_date
  ON public.competitor_data(propertyId, date);
CREATE INDEX idx_competitor_data_userId
  ON public.competitor_data(userId);
CREATE INDEX idx_competitor_data_scrapedAt
  ON public.competitor_data(scrapedAt DESC);

ALTER TABLE public.competitor_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitor data"
  ON public.competitor_data FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert own competitor data"
  ON public.competitor_data FOR INSERT
  WITH CHECK (auth.uid() = userId);
```

#### 8. `public.api_keys` (Task 2, 12)

```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- API key details
  name TEXT NOT NULL,  -- User-friendly name
  keyPrefix TEXT NOT NULL,  -- e.g., 'jen_live_' or 'jen_test_'
  keyHash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of full key

  -- Permissions
  role TEXT DEFAULT 'partner' CHECK (role IN ('partner', 'admin', 'readonly')),
  scopes JSONB DEFAULT '[]',  -- ['pricing:read', 'analytics:read', etc.]

  -- Rate limiting
  rateLimit INTEGER DEFAULT 100,  -- requests per minute
  quotaDaily INTEGER,  -- total requests per day
  quotaMonthly INTEGER,

  -- Status
  isActive BOOLEAN DEFAULT true,
  expiresAt TIMESTAMPTZ,
  lastUsedAt TIMESTAMPTZ,

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT api_keys_userId_name_key UNIQUE(userId, name)
);

CREATE INDEX idx_api_keys_userId ON public.api_keys(userId);
CREATE INDEX idx_api_keys_keyHash ON public.api_keys(keyHash);
CREATE INDEX idx_api_keys_active ON public.api_keys(isActive) WHERE isActive = true;

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
  ON public.api_keys FOR ALL
  USING (auth.uid() = userId);
```

#### 9. `public.api_key_usage` (Task 12)

```sql
CREATE TABLE public.api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apiKeyId UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,

  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  statusCode INTEGER,
  responseTime INTEGER,  -- milliseconds

  -- IP & User Agent
  ipAddress INET,
  userAgent TEXT,

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_key_usage_apiKeyId_timestamp
  ON public.api_key_usage(apiKeyId, timestamp DESC);
CREATE INDEX idx_api_key_usage_timestamp
  ON public.api_key_usage(timestamp DESC);

-- RLS: No direct user access (service role only)
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.api_key_usage FOR ALL
  USING (auth.role() = 'service_role');
```

#### 10. `public.smart_alerts` (Task 13)

```sql
CREATE TABLE public.smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  propertyId UUID REFERENCES public.properties(id) ON DELETE CASCADE,

  -- Alert details
  alertType TEXT NOT NULL CHECK (alertType IN (
    'revenue_drop', 'conversion_drop', 'competitor_price_change',
    'occupancy_high', 'occupancy_low', 'price_outlier', 'demand_spike'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Message
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  actionable JSONB,  -- {action: 'adjust_price', params: {...}}

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'snoozed', 'resolved')),
  dismissedAt TIMESTAMPTZ,
  snoozedUntil TIMESTAMPTZ,

  -- Delivery
  deliveredVia JSONB DEFAULT '[]',  -- ['email', 'sms', 'webhook']

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_smart_alerts_userId_status
  ON public.smart_alerts(userId, status) WHERE status = 'active';
CREATE INDEX idx_smart_alerts_propertyId
  ON public.smart_alerts(propertyId);
CREATE INDEX idx_smart_alerts_createdAt
  ON public.smart_alerts(createdAt DESC);

-- RLS
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON public.smart_alerts FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can update own alerts"
  ON public.smart_alerts FOR UPDATE
  USING (auth.uid() = userId);
```

#### 11. `public.alert_rules` (Task 13)

```sql
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  propertyId UUID REFERENCES public.properties(id) ON DELETE CASCADE,

  -- Rule definition
  ruleName TEXT NOT NULL,
  alertType TEXT NOT NULL,
  condition JSONB NOT NULL,  -- {metric: 'revenue', operator: '<', threshold: 1000, period: '7d'}

  -- Thresholds
  threshold DECIMAL(10, 2),
  comparisonPeriod TEXT,  -- 'previous_week', 'previous_month', 'same_period_last_year'

  -- Actions
  notificationChannels JSONB DEFAULT '["email"]',  -- ['email', 'sms', 'webhook']
  webhookUrl TEXT,

  -- Status
  isActive BOOLEAN DEFAULT true,
  lastTriggeredAt TIMESTAMPTZ,
  triggerCount INTEGER DEFAULT 0,

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT alert_rules_userId_ruleName_key UNIQUE(userId, ruleName)
);

CREATE INDEX idx_alert_rules_userId_active
  ON public.alert_rules(userId, isActive) WHERE isActive = true;
CREATE INDEX idx_alert_rules_propertyId
  ON public.alert_rules(propertyId);

-- RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert rules"
  ON public.alert_rules FOR ALL
  USING (auth.uid() = userId);
```

#### 12. `public.competitor_hotels` (Task 15)

```sql
CREATE TABLE public.competitor_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hotel details
  name VARCHAR(255) NOT NULL,
  location JSONB NOT NULL,  -- {latitude, longitude, address, city, country}
  starRating DECIMAL(2, 1),
  reviewScore DECIMAL(3, 1),

  -- Amenities (for similarity calculation)
  amenities JSONB,  -- ['wifi', 'parking', 'pool', 'gym', etc.]
  amenityVector JSONB,  -- One-hot encoded for cosine similarity

  -- Metadata
  source TEXT DEFAULT 'makcorps',
  externalId TEXT,  -- ID in external system
  url TEXT,

  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT competitor_hotels_externalId_source_key UNIQUE(externalId, source)
);

CREATE INDEX idx_competitor_hotels_location
  ON public.competitor_hotels USING GIST (((location->>'latitude')::numeric), ((location->>'longitude')::numeric));
CREATE INDEX idx_competitor_hotels_starRating
  ON public.competitor_hotels(starRating);
```

#### 13. `public.competitor_relationships` (Task 15)

```sql
CREATE TABLE public.competitor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propertyId UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  competitorHotelId UUID NOT NULL REFERENCES public.competitor_hotels(id) ON DELETE CASCADE,

  -- Similarity scores (0.0000 to 1.0000)
  geoSimilarity DECIMAL(5, 4) NOT NULL,      -- Based on distance
  amenitySimilarity DECIMAL(5, 4) NOT NULL,  -- Cosine similarity of amenities
  reviewSimilarity DECIMAL(5, 4) NOT NULL,   -- Based on star rating + review score
  overallSimilarity DECIMAL(5, 4) NOT NULL,  -- Weighted: 40% geo + 30% amenity + 30% review

  -- Distance
  distanceKm DECIMAL(6, 2),

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT competitor_relationships_property_competitor_key
    UNIQUE(propertyId, competitorHotelId)
);

CREATE INDEX idx_competitor_relationships_propertyId
  ON public.competitor_relationships(propertyId);
CREATE INDEX idx_competitor_relationships_overall_similarity
  ON public.competitor_relationships(overallSimilarity DESC);
```

#### 14. `public.neighborhood_competitive_index` (Task 15)

```sql
CREATE TABLE public.neighborhood_competitive_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propertyId UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Index components (0.00 to 100.00)
  priceCompetitivenessScore DECIMAL(5, 2) NOT NULL,  -- How competitive your price is
  valueScore DECIMAL(5, 2) NOT NULL,                 -- Price/quality ratio
  positioningScore DECIMAL(5, 2) NOT NULL,           -- Market position (budget/mid/premium)
  overallIndex DECIMAL(5, 2) NOT NULL,               -- Weighted composite: 40% price + 35% value + 25% positioning

  -- Market context
  marketPosition TEXT,  -- 'ultra-premium', 'premium', 'mid-market', 'budget'
  competitorCount INTEGER,

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT neighborhood_index_property_date_key UNIQUE(propertyId, date)
);

CREATE INDEX idx_neighborhood_index_propertyId_date
  ON public.neighborhood_competitive_index(propertyId, date DESC);
CREATE INDEX idx_neighborhood_index_overallIndex
  ON public.neighborhood_competitive_index(overallIndex);
```

#### 15. `public.bandit_actions` (Task 18)

```sql
CREATE TABLE public.bandit_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propertyId UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Arm selection
  armId VARCHAR(50) NOT NULL,  -- 'delta_-15', 'delta_-10', ..., 'delta_+15'
  deltaPct DECIMAL(5, 2) NOT NULL,  -- -15.00 to +15.00

  -- Pricing
  basePrice DECIMAL(10, 2) NOT NULL,
  finalPrice DECIMAL(10, 2) NOT NULL,

  -- Policy decision
  policy VARCHAR(50) NOT NULL,  -- 'explore' or 'exploit'
  epsilon DECIMAL(5, 4) NOT NULL,  -- Epsilon value used (0.0000 to 1.0000)

  -- Context snapshot (for debugging)
  context JSONB,  -- {occupancy_rate, lead_days, season, etc.}
  qValues JSONB,  -- Snapshot of all Q-values at decision time

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bandit_actions_propertyId_timestamp
  ON public.bandit_actions(propertyId, timestamp DESC);
CREATE INDEX idx_bandit_actions_armId
  ON public.bandit_actions(armId);
```

#### 16. `public.bandit_rewards` (Task 18)

```sql
CREATE TABLE public.bandit_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actionId UUID NOT NULL REFERENCES public.bandit_actions(id) ON DELETE CASCADE,
  propertyId UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  -- Outcome
  bookingMade BOOLEAN NOT NULL,
  actualRevenue DECIMAL(10, 2) NOT NULL,  -- 0 if no booking
  reward DECIMAL(10, 2) NOT NULL,  -- Same as actualRevenue

  -- Timing
  timeToBook INTERVAL,  -- Time from quote to booking

  -- Updated Q-value after this reward
  updatedQValue DECIMAL(10, 2),

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bandit_rewards_actionId
  ON public.bandit_rewards(actionId);
CREATE INDEX idx_bandit_rewards_propertyId_timestamp
  ON public.bandit_rewards(propertyId, timestamp DESC);
```

#### 17. `public.bandit_config` (Task 18)

```sql
CREATE TABLE public.bandit_config (
  propertyId UUID PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feature flags
  enabled BOOLEAN DEFAULT false,
  trafficPercentage DECIMAL(5, 2) DEFAULT 5.0,  -- 0.00 to 100.00

  -- Hyperparameters
  epsilon DECIMAL(5, 4) DEFAULT 0.1,  -- Exploration rate
  learningRate DECIMAL(5, 4) DEFAULT 0.1,

  -- Safety bounds
  minPrice DECIMAL(10, 2),
  maxPrice DECIMAL(10, 2),
  conservativeMode BOOLEAN DEFAULT true,

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bandit_config_userId
  ON public.bandit_config(userId);
CREATE INDEX idx_bandit_config_enabled
  ON public.bandit_config(enabled) WHERE enabled = true;
```

### Database Functions

#### Helper Function: `get_property_stats`

```sql
CREATE OR REPLACE FUNCTION get_property_stats(property_uuid UUID)
RETURNS TABLE (
  total_rows BIGINT,
  date_range_start DATE,
  date_range_end DATE,
  avg_price DECIMAL,
  avg_occupancy DECIMAL,
  enrichment_coverage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    MIN(date),
    MAX(date),
    AVG(price),
    AVG(occupancy),
    (COUNT(*) FILTER (WHERE temperature IS NOT NULL))::DECIMAL / NULLIF(COUNT(*), 0)
  FROM public.pricing_data
  WHERE propertyId = property_uuid;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Database Migrations

**Location**: `backend/migrations/*.sql`

**Migration Files**:

1. `add_enrichment_columns.sql` - Add enrichmentStatus, enrichedAt to properties
2. `add_api_keys_table.sql` - Create api_keys, api_key_usage, api_rate_limits
3. `add_pricing_engine_tables.sql` - Create pricing_readiness table
4. `add_smart_alerts_tables.sql` - Create smart_alerts, alert_rules
5. `add_bandit_tables.sql` - Create bandit_actions, bandit_rewards, bandit_config
6. `add_competitor_graph_tables.sql` - Create competitor_hotels, competitor_relationships, neighborhood_competitive_index
7. `partition_pricing_data.sql` - Partition pricing_data by month + automated maintenance

**Run Order**: Sequential (numbered)

---

## API REFERENCE

### Authentication

All authenticated endpoints require JWT token in header:

```
Authorization: Bearer <token>
```

Or httpOnly cookie (set by `/api/auth/login`):

```
Cookie: access_token=<token>
```

### Base URL

**Development**: `http://localhost:3001/api`
**Production**: `https://api.jengu.app/api`

### Endpoint Categories

1. **Auth** (5 endpoints)
2. **Files** (6 endpoints)
3. **Analytics** (8 endpoints)
4. **Pricing** (3 endpoints)
5. **Assistant** (4 endpoints)
6. **Competitor** (8 endpoints)
7. **Alerts** (11 endpoints)
8. **Jobs** (4 endpoints)
9. **Weather** (3 endpoints)
10. **Other** (15+ endpoints)

**Total**: 70+ endpoints

### 1. Authentication Endpoints

#### POST `/api/auth/login`

**Purpose**: Authenticate user with email/password

**Request**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200):

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_jwt",
    "expires_in": 900,
    "expires_at": 1736940000
  }
}
```

**Cookies Set**:

- `access_token` (httpOnly, 15 minutes)
- `refresh_token` (httpOnly, 7 days, path=/api/auth)

**Rate Limit**: 5 attempts per 15 minutes

---

#### POST `/api/auth/signup`

**Purpose**: Create new user account

**Request**:

```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "name": "John Doe" // optional
}
```

**Response** (201):

```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "message": "Account created successfully. Please check your email to confirm."
}
```

**Rate Limit**: 5 attempts per 15 minutes

---

#### POST `/api/auth/logout`

**Purpose**: Sign out user and clear cookies

**Request**: Empty body

**Response** (200):

```json
{
  "message": "Logged out successfully"
}
```

**Cookies Cleared**: access_token, refresh_token

---

#### POST `/api/auth/refresh`

**Purpose**: Refresh access token using refresh token

**Request**: Empty body (refresh_token from cookie)

**Response** (200):

```json
{
  "session": {
    "access_token": "new_jwt_token",
    "expires_in": 900
  }
}
```

---

#### GET `/api/auth/me`

**Purpose**: Get current user profile

**Auth**: Required

**Response** (200):

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed_at": "2025-01-15T10:05:00Z",
    "created_at": "2025-01-15T10:00:00Z",
    "last_sign_in_at": "2025-01-20T14:30:00Z"
  }
}
```

---

### 2. File Management Endpoints

#### POST `/api/files/upload`

**Purpose**: Upload CSV file with pricing data

**Auth**: Required
**Content-Type**: multipart/form-data
**Rate Limit**: 10 uploads per hour

**Request**:

```
FormData:
  file: <CSV file>
  autoEnrich: true|false (optional)
```

**CSV Expected Columns** (auto-detected):

- date (required): YYYY-MM-DD
- price (required): numeric
- occupancy (optional): 0-1 or 0-100
- revenue (optional): numeric
- productType (optional): text
- refundable (optional): boolean

**Response** (200):

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "property": {
    "id": "uuid",
    "fileName": "pricing_data_2025.csv",
    "rowCount": 1250,
    "columnCount": 8,
    "uploadedAt": "2025-01-20T15:00:00Z",
    "enrichmentStatus": "pending"
  },
  "preview": [
    { "date": "2025-01-01", "price": 120.5, "occupancy": 0.85 }
    // ... first 10 rows
  ],
  "jobId": "enrich-uuid-timestamp" // if autoEnrich=true
}
```

**Error** (400):

```json
{
  "error": "InvalidCSV",
  "message": "Required column 'date' not found. Available columns: ['Date', 'Price']"
}
```

---

#### GET `/api/files`

**Purpose**: List all uploaded files

**Auth**: Required

**Response** (200):

```json
{
  "files": [
    {
      "id": "uuid1",
      "fileName": "pricing_2025_q1.csv",
      "rowCount": 2500,
      "uploadedAt": "2025-01-15T10:00:00Z",
      "enrichmentStatus": "completed",
      "enrichedAt": "2025-01-15T10:15:00Z"
    },
    {
      "id": "uuid2",
      "fileName": "pricing_2025_q2.csv",
      "rowCount": 1800,
      "uploadedAt": "2025-01-20T14:00:00Z",
      "enrichmentStatus": "pending"
    }
  ],
  "total": 2
}
```

---

#### GET `/api/files/:fileId/data`

**Purpose**: Get pricing data rows (paginated)

**Auth**: Required

**Query Params**:

- `limit` (optional): Max rows (default 1000, max 10000)
- `offset` (optional): Skip rows (default 0)

**Response** (200):

```json
{
  "data": [
    {
      "id": "row_uuid",
      "date": "2025-01-01",
      "price": 120.5,
      "occupancy": 0.85,
      "revenue": 510.0,
      "temperature": 5.2,
      "precipitation": 0.0,
      "dayOfWeek": 3,
      "isWeekend": false,
      "season": "Winter"
    }
    // ... more rows
  ],
  "total": 2500,
  "limit": 1000,
  "offset": 0,
  "hasMore": true
}
```

---

#### POST `/api/files/:fileId/enrich`

**Purpose**: Trigger enrichment job (weather, holidays, temporal features)

**Auth**: Required
**Timeout**: 10 minutes

**Request**:

```json
{
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "countryCode": "FR" // optional, for holidays
}
```

**Response** (202):

```json
{
  "success": true,
  "message": "Enrichment job queued",
  "jobId": "enrich-uuid-timestamp",
  "estimatedTime": "5-10 minutes"
}
```

**Long-Running**: Use `/api/jobs/:jobId` to poll status

---

#### DELETE `/api/files/:fileId`

**Purpose**: Delete file and all associated pricing data

**Auth**: Required

**Response** (200):

```json
{
  "success": true,
  "message": "File and 2500 pricing records deleted"
}
```

---

### 3. Analytics Endpoints

#### POST `/api/analytics/summary`

**Purpose**: Get statistical summary of pricing data

**Auth**: Required

**Request**:

```json
{
  "propertyId": "uuid",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-03-31"
  }
}
```

**Response** (200):

```json
{
  "summary": {
    "totalRows": 90,
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-03-31"
    },
    "price": {
      "mean": 125.5,
      "median": 120.0,
      "min": 80.0,
      "max": 250.0,
      "stdDev": 35.2
    },
    "occupancy": {
      "mean": 0.72,
      "median": 0.75,
      "min": 0.35,
      "max": 1.0
    },
    "revenue": {
      "total": 11295.0,
      "mean": 125.5,
      "trend": "increasing"
    }
  },
  "trends": {
    "dayOfWeek": {
      "Friday": 145.0,
      "Saturday": 180.0,
      "Sunday": 150.0,
      "Monday": 105.0
      // ...
    },
    "seasonality": {
      "Winter": 115.0,
      "Spring": 125.0,
      "Summer": 165.0,
      "Fall": 120.0
    }
  }
}
```

---

#### POST `/api/analytics/weather-impact`

**Purpose**: Analyze correlation between weather and pricing/occupancy

**Auth**: Required

**Request**:

```json
{
  "propertyId": "uuid"
}
```

**Response** (200):

```json
{
  "correlations": {
    "temperature_vs_price": 0.45,
    "temperature_vs_occupancy": 0.62,
    "precipitation_vs_price": -0.28,
    "precipitation_vs_occupancy": -0.35
  },
  "insights": [
    "Strong positive correlation (0.62) between temperature and occupancy",
    "Moderate negative impact of precipitation on pricing (-0.28)"
  ],
  "recommendations": [
    "Consider dynamic pricing adjustments based on weather forecasts",
    "Increase prices by 10-15% during sunny weekends"
  ]
}
```

---

#### POST `/api/analytics/ai-insights`

**Purpose**: Generate natural language insights using Claude AI

**Auth**: Required
**Timeout**: 30 seconds
**Rate Limit**: 10 requests per minute

**Request**:

```json
{
  "propertyId": "uuid",
  "analyticsData": {
    "summary": {
      /* ... */
    },
    "trends": {
      /* ... */
    }
  }
}
```

**Response** (200):

```json
{
  "insights": "Your pricing data shows strong weekend demand with Saturday prices averaging €180, a 50% premium over weekday rates. The summer season (June-August) demonstrates the highest revenue potential at €165 average daily rate. Weather correlation analysis reveals occupancy increases 62% during sunny periods, suggesting weather-responsive pricing could capture an additional 10-15% revenue. Current occupancy trend of 72% indicates room for strategic rate increases during high-demand periods.",
  "keyFindings": [
    "Weekend premium opportunity: +50% pricing power",
    "Summer peak season: €165 ADR achievable",
    "Weather-responsive pricing: +10-15% revenue potential",
    "Occupancy optimization: 72% baseline with upside"
  ],
  "recommendations": [
    "Implement dynamic weekend pricing with 40-60% premium",
    "Leverage weather forecasts for 48-hour pricing adjustments",
    "Test price elasticity during shoulder seasons",
    "Monitor competitor pricing on high-demand dates"
  ],
  "model": "claude-sonnet-4-5-20250929",
  "tokensUsed": 1250
}
```

---

_[Document continues with remaining 60+ endpoints...]_

---

## FILE STRUCTURE

### Complete Directory Tree

```
jengu/
├── backend/                          # Node.js + TypeScript backend
│   ├── server.ts                     # Main server (7,400 lines, all routes)
│   ├── package.json                  # Dependencies (40+ packages)
│   ├── tsconfig.json                 # TypeScript strict mode config
│   ├── .env.example                  # Environment template
│   │
│   ├── config/
│   │   └── database.ts               # Supabase connection config
│   │
│   ├── middleware/
│   │   ├── authenticateApiKey.ts     # API key validation (Task 2, 12)
│   │   ├── logger.ts                 # Pino HTTP logger
│   │   ├── rateLimiters.ts           # Rate limit configs (6 limiters)
│   │   └── requestId.ts              # UUID generation per request
│   │
│   ├── routes/
│   │   ├── alerts.ts                 # Smart alerts (11 endpoints)
│   │   ├── analytics.ts              # ML analytics (8 endpoints)
│   │   ├── auth.ts                   # Authentication (5 endpoints)
│   │   ├── bandit.ts                 # Contextual bandit (4 endpoints)
│   │   ├── competitorData.ts         # Competitor CRUD (6 endpoints)
│   │   ├── competitor.ts             # Scraping + search (2 endpoints)
│   │   ├── files.ts                  # File upload (6 endpoints)
│   │   ├── geocoding.ts              # Location lookup (3 endpoints)
│   │   ├── health.ts                 # Health check (1 endpoint)
│   │   ├── holidays.ts               # Holiday data (1 endpoint)
│   │   ├── jobs.ts                   # Job management (4 endpoints)
│   │   ├── metrics.ts                # Prometheus metrics (2 endpoints)
│   │   ├── neighborhoodIndex.ts      # Spatial index (5 endpoints)
│   │   ├── pricing.ts                # Dynamic pricing (3 endpoints)
│   │   ├── settings.ts               # User settings (2 endpoints)
│   │   └── weather.ts                # Weather data (3 endpoints)
│   │
│   ├── services/
│   │   ├── alertDelivery.ts          # (DELETED - unused)
│   │   ├── alertEngine.ts            # Alert evaluation (~600 lines)
│   │   ├── banditService.ts          # RL bandit (~400 lines)
│   │   ├── competitorDataService.ts  # Data persistence
│   │   ├── competitorGraphService.ts # Graph algorithms (~500 lines)
│   │   ├── competitorScraper.ts      # Playwright scraper (~700 lines)
│   │   ├── csvMapper.ts              # Auto column detection
│   │   ├── dataTransform.ts          # Validation & transformation
│   │   ├── enrichmentService.ts      # Weather/holiday enrichment (~500 lines)
│   │   ├── holidayService.ts         # Calendarific caching
│   │   ├── marketSentiment.ts        # AI insights (~600 lines)
│   │   ├── mlAnalytics.ts            # Statistical analysis (~800 lines)
│   │   ├── neighborhoodIndexService.ts # Competitive index (~550 lines)
│   │   └── weatherCacheService.ts    # Open-Meteo caching (~300 lines)
│   │
│   ├── workers/
│   │   ├── analyticsWorker.ts        # Heavy analytics (concurrency: 2)
│   │   ├── competitorCronWorker.ts   # Scheduled scraping
│   │   ├── competitorWorker.ts       # Scraping jobs (concurrency: 2)
│   │   ├── enrichmentWorker.ts       # Enrichment (concurrency: 3)
│   │   └── neighborhoodIndexWorker.ts # Index computation
│   │
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client (anon + service role)
│   │   ├── sentry.ts                 # Error tracking setup
│   │   ├── openapi/
│   │   │   ├── config.ts             # OpenAPI generator config
│   │   │   ├── index.ts              # Export spec
│   │   │   └── schemas.ts            # Zod schemas
│   │   ├── queue/
│   │   │   ├── connection.ts         # Redis connection
│   │   │   └── queues.ts             # BullMQ queue definitions
│   │   └── socket/
│   │       └── server.ts             # Socket.IO setup
│   │
│   ├── migrations/
│   │   ├── add_api_keys_table.sql
│   │   ├── add_bandit_tables.sql
│   │   ├── add_competitor_graph_tables.sql
│   │   ├── add_enrichment_columns.sql
│   │   ├── add_pricing_engine_tables.sql
│   │   ├── add_smart_alerts_tables.sql
│   │   └── partition_pricing_data.sql
│   │
│   ├── prisma/
│   │   ├── competitor-daily-schema.sql
│   │   └── enrichment-cache-tables.sql
│   │
│   ├── scripts/
│   │   ├── benchmark-queries.sql     # Performance testing
│   │   ├── generate-openapi.ts       # OpenAPI spec generator
│   │   └── maintain-partitions.sql   # Partition management cron
│   │
│   ├── test/
│   │   ├── competitorScraper.test.ts
│   │   ├── neighborhoodIndex.test.ts
│   │   └── pricingSimulator.test.ts
│   │
│   ├── email-templates/
│   │   ├── alert-digest.html         # Daily digest email
│   │   └── single-alert.html         # Single alert email
│   │
│   └── openapi.json                  # Generated OpenAPI 3.0 spec (33KB)
│
├── frontend/                         # React + TypeScript SPA
│   ├── package.json                  # Dependencies (35+ packages)
│   ├── tsconfig.json                 # TypeScript strict config
│   ├── vite.config.ts                # Vite build config + proxy
│   ├── tailwind.config.js            # Custom theme + colors
│   ├── index.html                    # Entry HTML
│   │
│   ├── src/
│   │   ├── main.tsx                  # Entry point (Sentry + React Query)
│   │   ├── App.tsx                   # Router + Auth provider
│   │   ├── index.css                 # Global styles + Tailwind
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Main dashboard
│   │   │   ├── Analytics.tsx         # Unified analytics (formerly Insights + Director)
│   │   │   ├── PricingEngine.tsx     # Pricing optimizer
│   │   │   ├── CompetitorMonitor.tsx # Competitor tracking
│   │   │   ├── Data.tsx              # File upload & management
│   │   │   ├── Assistant.tsx         # AI chat
│   │   │   ├── Settings.tsx          # Business profile
│   │   │   └── Auth.tsx              # Login/signup
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   # Design system (15 components)
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Progress.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx        # Main wrapper (sidebar + content)
│   │   │   │   ├── Sidebar.tsx       # Legacy navigation (v1)
│   │   │   │   ├── SidebarV2.tsx     # New grouped navigation (active)
│   │   │   │   └── FloatingAssistant.tsx
│   │   │   │
│   │   │   ├── insights/             # Analytics components
│   │   │   │   ├── AIInsightsCard.tsx
│   │   │   │   ├── MLAnalyticsCard.tsx
│   │   │   │   ├── MarketSentimentCard.tsx
│   │   │   │   ├── NeighborhoodIndexCard.tsx
│   │   │   │   └── charts/
│   │   │   │       ├── CorrelationHeatmapChart.tsx
│   │   │   │       ├── WeatherImpactChart.tsx
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── director/             # Advanced analytics charts
│   │   │   │   ├── AdrIndexChart.tsx
│   │   │   │   ├── OccupancyPaceChart.tsx
│   │   │   │   ├── RevLeadHeatmap.tsx
│   │   │   │   ├── ElasticityCurveChart.tsx
│   │   │   │   ├── ForecastActualChart.tsx
│   │   │   │   ├── PriceWaterfallChart.tsx
│   │   │   │   └── RevenueGainChart.tsx
│   │   │   │
│   │   │   ├── pricing/
│   │   │   │   └── PricingSimulator.tsx
│   │   │   │
│   │   │   ├── data/
│   │   │   │   └── ColumnMappingModal.tsx
│   │   │   │
│   │   │   ├── features/
│   │   │   │   └── EnrichmentProgress.tsx
│   │   │   │
│   │   │   ├── dev/
│   │   │   │   └── NavigationFlagToggle.tsx
│   │   │   │
│   │   │   └── ErrorBoundary.tsx
│   │   │
│   │   ├── store/
│   │   │   ├── useDataStore.ts       # File management (Zustand)
│   │   │   └── useBusinessStore.ts   # Business profile (Zustand)
│   │   │
│   │   ├── stores/
│   │   │   ├── useDashboardStore.ts  # Dashboard UI state (Zustand)
│   │   │   └── useNavigationStore.ts # Feature flags (Zustand)
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Auth state + methods
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts           # Supabase client
│   │   │   ├── sentry.ts             # Error tracking
│   │   │   ├── chartConfig.ts        # Chart theme
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── client.ts         # Axios instance (JWT interceptor)
│   │   │   │   ├── index.ts          # Barrel export
│   │   │   │   └── services/         # API modules (11 files)
│   │   │   │       ├── analytics.ts
│   │   │   │       ├── assistant.ts
│   │   │   │       ├── competitor.ts
│   │   │   │       ├── data.ts
│   │   │   │       ├── enrichment.ts
│   │   │   │       ├── files.ts
│   │   │   │       ├── insights.ts
│   │   │   │       ├── pricing.ts
│   │   │   │       ├── settings.ts
│   │   │   │       └── weather.ts
│   │   │   │
│   │   │   ├── query/
│   │   │   │   ├── queryClient.ts    # React Query config
│   │   │   │   └── hooks/
│   │   │   │       ├── useAnalytics.ts
│   │   │   │       ├── useEnrichment.ts
│   │   │   │       └── useProperties.ts
│   │   │   │
│   │   │   └── services/
│   │   │       └── analyticsService.ts
│   │   │
│   │   ├── hooks/
│   │   │   └── queries/
│   │   │       ├── useFileData.ts
│   │   │       ├── useBusinessSettings.ts
│   │   │       └── ...
│   │   │
│   │   ├── types/
│   │   │   └── analytics.ts
│   │   │
│   │   └── config/
│   │       └── echartsTheme.ts
│   │
│   └── public/
│       └── vite.svg
│
├── pricing-service/                  # Python + FastAPI ML service
│   ├── main.py                       # FastAPI app (700 lines, 13 endpoints)
│   ├── pricing_engine.py             # 14-step pricing algorithm (737 lines)
│   ├── competitor_data_client.py     # Backend API client
│   ├── requirements.txt              # Python dependencies (20+ packages)
│   ├── .env.example                  # Environment template
│   │
│   ├── models/
│   │   └── model_registry.py         # LightGBM model management (356 lines)
│   │
│   ├── training/
│   │   ├── train_lightgbm.py         # Model training (445 lines)
│   │   └── retrain_weekly.py         # Automated retraining (405 lines)
│   │
│   ├── learning/
│   │   ├── outcomes_storage.py       # Parquet-based outcomes (400 lines)
│   │   └── drift_detection.py        # KS test + PSI (366 lines)
│   │
│   ├── ab_testing/
│   │   ├── ab_framework.py           # A/B experiment framework (450 lines)
│   │   ├── contextual_bandit.py      # Epsilon-greedy + Thompson Sampling (450 lines)
│   │   └── test_bandit.py            # Unit tests
│   │
│   ├── backtesting/
│   │   └── backtest.py               # Historical validation (364 lines)
│   │
│   ├── data/
│   │   ├── dataset_builder.py        # Feature engineering (468 lines)
│   │   └── outcomes/                 # Parquet files (property_id_outcomes.parquet)
│   │
│   ├── observability/
│   │   ├── sentry_config.py          # Error tracking setup
│   │   ├── prometheus_metrics.py     # Metrics collection
│   │   ├── grafana_dashboard.json    # Dashboard template
│   │   ├── prometheus_alerts.yml     # Alert rules
│   │   └── README.md
│   │
│   └── proto/
│       └── pricing.proto             # gRPC protocol definition (Task 17)
│
├── k8s/                              # Kubernetes deployment manifests
│   ├── README.md
│   ├── enrichment-worker-deployment.yaml
│   ├── competitor-worker-deployment.yaml
│   └── analytics-worker-deployment.yaml
│
├── .github/
│   └── workflows/
│       ├── security-scan.yml         # TruffleHog + CodeQL
│       └── weekly-retrain.yml        # Scheduled ML retraining
│
├── docs/                             # Documentation
│   ├── completion-reports/           # All 18 task completion reports
│   │   ├── 01-task1-TEST-HARNESS-CI-2025-10-23.md
│   │   ├── 02-task2-AUTH-TOKENS-HARDENING-2025-10-23.md
│   │   ├── ...
│   │   └── 18-task18-RL-BANDIT-2025-10-23.md
│   │
│   ├── developer/                    # Technical guides
│   │   ├── ARCHITECTURE.md
│   │   ├── COMPETITOR_DATA.md
│   │   ├── DB_PARTITIONING_RUNBOOK.md
│   │   ├── GRPC_SETUP.md
│   │   ├── LEARNING_LOOP.md
│   │   ├── LIGHTGBM_ELASTICITY_PRICING.md
│   │   ├── OBSERVABILITY.md
│   │   ├── OPENAPI.md
│   │   ├── QUEUE_SYSTEM.md
│   │   ├── SMART_ALERTS.md
│   │   └── SUPABASE_SECURITY.md
│   │
│   ├── audits/
│   │   ├── 2025-10-22-DATA-PIPELINE-AUDIT.md
│   │   ├── 2025-10-22-IA-AUDIT.md
│   │   └── 2025-10-24-CODE-CLEANUP-AUDIT.md
│   │
│   ├── project-summaries/
│   │   ├── PROJECT-COMPLETION-SUMMARY-2025-10-23.md
│   │   ├── FINAL-STATUS-2025-10-23.md
│   │   └── TASK-STATUS-SUMMARY-2025-10-23.md
│   │
│   ├── sessions/
│   │   ├── 2025-10-20-INTELLIGENT-CSV-MAPPER.md
│   │   ├── 2025-10-22-IA-IMPLEMENTATION.md
│   │   └── 2025-10-22-PRICING-DASHBOARD-V2.md
│   │
│   ├── guides/
│   │   ├── COMPLETE-SYSTEM-GUIDE.md
│   │   └── E2E-TESTING-GUIDE.md
│   │
│   ├── monitoring/
│   │   └── grafana-queue-dashboard.json
│   │
│   └── archive/                      # Historical docs (may be outdated)
│
├── sdks/                             # Auto-generated SDKs (Task 12)
│   └── generate-sdks.sh
│
├── docs/
│   ├── developer/
│   │   └── TECHNICAL-ARCHITECTURE.md # Main architecture doc
│   ├── setup/
│   │   └── API-SETUP-QUICKSTART.md   # Quick start guide
│   └── API-KEYS-REQUIRED.md          # API setup guide
├── CLAUDE.md                         # Project instructions for Claude
├── pnpm-workspace.yaml               # Monorepo config
├── package.json                      # Root package.json
└── pnpm-lock.yaml                    # Lockfile (monorepo)
```

---

## ENVIRONMENT VARIABLES

### Backend (.env)

```bash
# ========================================
# CRITICAL - REQUIRED
# ========================================

# Supabase
SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
SUPABASE_ANON_KEY=<get_from_supabase_dashboard>
SUPABASE_SERVICE_KEY=<get_from_supabase_dashboard>

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ========================================
# HIGH PRIORITY - CORE FEATURES
# ========================================

# Anthropic Claude (AI insights)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Redis (job queue + caching)
REDIS_URL=redis://localhost:6379
# OR Redis Cloud: redis://default:password@host:port

# ========================================
# MEDIUM PRIORITY - IMPORTANT FEATURES
# ========================================

# OpenWeather (current/forecast weather)
OPENWEATHER_API_KEY=<key>

# SendGrid (email alerts)
SENDGRID_API_KEY=SG.<key>
ALERT_FROM_EMAIL=alerts@yourdomain.com
ALERT_FROM_NAME=Jengu Pricing Alerts

# Makcorps (competitor hotel search)
MAKCORPS_API_KEY=<key>

# ========================================
# OPTIONAL - ENABLE LATER
# ========================================

# Sentry (error tracking)
SENTRY_DSN=https://...@sentry.io/project_id
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1

# Twilio (SMS alerts)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=+1234567890

# Mapbox (geocoding fallback)
MAPBOX_TOKEN=<token>

# ========================================
# CONFIGURATION
# ========================================

# Pricing service URL
PRICING_SERVICE_URL=http://localhost:8000

# Worker concurrency
ENRICHMENT_WORKER_CONCURRENCY=3
COMPETITOR_WORKER_CONCURRENCY=2
ANALYTICS_WORKER_CONCURRENCY=2

# Job chaining
ENABLE_AUTO_ANALYTICS=true

# gRPC (optional)
ENABLE_GRPC=false
PRICING_GRPC_HOST=localhost:50051

# Logging
LOG_LEVEL=info
LOG_PRETTY=true

# Rate limiting
MAX_REQUESTS_PER_MINUTE=100
```

### Frontend (.env)

```bash
# Supabase (public keys only)
VITE_SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
VITE_SUPABASE_ANON_KEY=<same_as_backend_anon_key>

# Backend API
VITE_API_URL=http://localhost:3001

# Sentry (optional)
VITE_SENTRY_DSN=https://...@sentry.io/frontend_project_id
```

### Pricing Service (.env)

```bash
# Server
HOST=0.0.0.0
PORT=8000

# Backend connection
BACKEND_API_URL=http://localhost:3001

# Supabase (service role for direct DB access)
SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<same_as_backend_service_key>

# Sentry
SENTRY_DSN=https://...@sentry.io/pricing_project_id
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=text

# Model configuration
BASE_PRICE=100.0
MIN_PRICE=50.0
MAX_PRICE=500.0
MODEL_REGISTRY_PATH=./models
MODEL_CACHE_SIZE=10

# Learning loop
OUTCOMES_STORAGE_PATH=./data/outcomes
ENABLE_AUTO_RETRAIN=false
RETRAIN_CRON_SCHEDULE=0 3 * * 0  # Weekly Sunday 3AM

# Feature toggles
ENABLE_ML_PREDICTIONS=true
ENABLE_COMPETITOR_PRICING=true
ENABLE_SEASONAL_ADJUSTMENT=true
ENABLE_WEATHER_ADJUSTMENTS=true
```

---

_[Document will continue with complete Data Flows, Integration Points, and Deployment Guide in follow-up response...]_

**Status**: This is Part 1 of the complete reference. Should I continue with the remaining sections?
