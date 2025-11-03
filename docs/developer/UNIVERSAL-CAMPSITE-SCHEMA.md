# UNIVERSAL CAMPSITE DATABASE SCHEMA
## Flexible Multi-Tenant Design for Any Campsite

**Created**: October 25, 2025
**Purpose**: SaaS-ready database schema that adapts to any campsite's data structure

---

## DESIGN PRINCIPLES

### 1. **Universal Flexibility**
- Support ANY accommodation type (mobile homes, pitches, glamping, chalets, etc.)
- Support ANY pricing model (per-night, per-week, per-person, all-inclusive)
- Support ANY number of seasons/rate periods
- Support ANY CSV data format

### 2. **Property-Level Configuration**
- Each campsite defines its own accommodation types
- Each campsite defines its own pricing structure
- Each campsite defines its own seasons
- Schema adapts to their needs, not vice versa

### 3. **Proper Data Correlation**
- Enrichment data (weather, holidays, events) linked by DATE and LOCATION
- One enrichment record per day per location
- All pricing data references the same enrichment data
- No duplication of weather/holiday data

### 4. **Future-Proof**
- Easy to add new data types
- Supports competitor monitoring
- Supports multiple properties per user
- Supports API integrations

---

## SCHEMA OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                      USER & PROPERTIES                       │
├─────────────────────────────────────────────────────────────┤
│  users (Supabase Auth)                                       │
│    └── business_settings (profile, location, config)        │
│    └── properties (campsites owned by user)                 │
│          ├── accommodation_types (user-defined)             │
│          └── seasonal_periods (user-defined seasons)        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     PRICING DATA (Core)                      │
├─────────────────────────────────────────────────────────────┤
│  daily_pricing                                               │
│    - Links to: property, accommodation_type, date           │
│    - Flexible JSON for any pricing structure                │
│    - References enrichment_data by date                     │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  ENRICHMENT DATA (Shared)                    │
├─────────────────────────────────────────────────────────────┤
│  enrichment_data                                             │
│    - One record per DATE per LOCATION                       │
│    - Weather, holidays, temporal features                   │
│    - Shared across all pricing records for that date        │
│                                                              │
│  Caches (for performance):                                  │
│    - weather_cache                                           │
│    - holiday_cache                                           │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMPETITOR DATA                           │
├─────────────────────────────────────────────────────────────┤
│  competitors (competitor campsites)                          │
│    └── competitor_pricing (daily pricing history)           │
│          └── References enrichment_data by date             │
└─────────────────────────────────────────────────────────────┘
```

---

## DETAILED TABLE SCHEMAS

### 1. PROPERTIES TABLE

The core entity representing a campsite.

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  property_type TEXT DEFAULT 'campsite', -- campsite, holiday_park, glamping_resort, etc.

  -- Location (for enrichment)
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8) NOT NULL,  -- Required for weather enrichment
  longitude DECIMAL(11, 8) NOT NULL, -- Required for weather enrichment
  timezone TEXT DEFAULT 'Europe/Paris',

  -- Property stats
  total_units INTEGER, -- Total accommodation units
  total_pitches INTEGER, -- If applicable
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),

  -- Configuration
  default_currency TEXT DEFAULT 'EUR',
  config JSONB DEFAULT '{}', -- Flexible property-specific settings

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

CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_properties_location ON properties(latitude, longitude);
CREATE INDEX idx_properties_active ON properties(user_id, is_active);
```

**Why flexible**: Each campsite can store ANY property-specific data in the `config` JSONB field.

---

### 2. ACCOMMODATION TYPES TABLE

User-defined accommodation types (mobile homes, pitches, etc.)

```sql
CREATE TABLE accommodation_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,

  -- Basic info (user defines these!)
  name TEXT NOT NULL, -- e.g., "Luxury Mobile Home", "Premium Pitch with Electric"
  code TEXT, -- Optional short code: "LUX-MH", "PREM-PITCH"
  category TEXT, -- e.g., "mobile_home", "pitch", "glamping", "chalet"

  -- Capacity
  capacity_people INTEGER,
  capacity_adults INTEGER,
  capacity_children INTEGER,
  bedrooms INTEGER,

  -- Physical attributes
  size_sqm DECIMAL(10, 2),
  surface_type TEXT, -- grass, hardstanding, mixed (for pitches)

  -- Attributes (flexible JSONB for any custom fields)
  attributes JSONB DEFAULT '{}', -- Examples:
  /*
    {
      "amenities": ["electric_16amp", "water", "drainage", "wifi"],
      "features": ["dishwasher", "ac", "terrace", "bbq"],
      "tier": "premium",
      "pitch_size": "100-120 sqm",
      "custom_field_1": "any value"
    }
  */

  -- Pricing defaults
  default_min_stay INTEGER DEFAULT 1,
  default_price DECIMAL(10, 2),

  -- Status
  total_units INTEGER DEFAULT 1, -- How many of this type exist
  is_active BOOLEAN DEFAULT TRUE,

  -- Display order
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(property_id, code)
);

CREATE INDEX idx_accommodation_types_property ON accommodation_types(property_id);
CREATE INDEX idx_accommodation_types_category ON accommodation_types(property_id, category);
CREATE INDEX idx_accommodation_types_active ON accommodation_types(property_id, is_active);
```

**Why flexible**:
- Campsite A can create "Luxury Mobile Home" and "Standard Pitch"
- Campsite B can create "Safari Tent", "Yurt", and "Tree House"
- Campsite C can have 50 different pitch types
- All work with the same schema!

---

### 3. SEASONAL PERIODS TABLE

User-defined seasons/rate periods.

```sql
CREATE TABLE seasonal_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,

  -- Season definition
  name TEXT NOT NULL, -- e.g., "High Season", "Peak", "Shoulder Spring"
  code TEXT, -- Optional: "PEAK", "HIGH", "SHOULDER_SPRING"

  -- Date range (can have multiple ranges for same season)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Pricing modifiers
  rate_multiplier DECIMAL(5, 2) DEFAULT 1.00, -- 1.00 = base, 1.30 = +30%, 0.70 = -30%
  default_min_stay INTEGER DEFAULT 1,

  -- Season attributes (flexible)
  attributes JSONB DEFAULT '{}', -- Examples:
  /*
    {
      "description": "Summer high season",
      "color": "#FF5733",
      "restrictions": ["min_stay_7_nights", "saturday_changeover"],
      "supplements": {
        "extra_adult": 8.50,
        "extra_child": 5.00,
        "electricity": 4.00
      }
    }
  */

  -- Priority (for overlapping seasons like holidays)
  priority INTEGER DEFAULT 0, -- Higher number = higher priority

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_seasonal_periods_property ON seasonal_periods(property_id);
CREATE INDEX idx_seasonal_periods_dates ON seasonal_periods(property_id, start_date, end_date);
```

**Why flexible**:
- Campsite A: 4 seasons (peak, high, shoulder, off)
- Campsite B: 6 seasons with holiday overlays
- Campsite C: 12 monthly seasons
- All supported!

---

### 4. DAILY PRICING TABLE (Core)

**This is the heart of the system** - stores actual pricing data.

```sql
CREATE TABLE daily_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  accommodation_type_id UUID REFERENCES accommodation_types(id) ON DELETE CASCADE NOT NULL,

  -- Date (the key!)
  date DATE NOT NULL,

  -- Pricing (flexible structure)
  price DECIMAL(10, 2), -- Base price
  pricing_data JSONB DEFAULT '{}', -- Flexible pricing details:
  /*
    {
      "base_price": 45.00,
      "pricing_unit": "per_night", // or "per_week"
      "supplements": {
        "extra_adult": 8.50,
        "extra_child": 5.00,
        "electricity": 4.00,
        "tourist_tax": 0.80
      },
      "discounts": {
        "early_booking": -5.00,
        "last_minute": -10.00
      },
      "total_price": 45.00,
      "currency": "EUR"
    }
  */

  -- Availability & bookings
  availability_status TEXT DEFAULT 'available', -- available, occupied, blocked, unavailable
  bookings_count INTEGER DEFAULT 0,
  occupancy_rate DECIMAL(5, 2), -- Percentage (0-100)

  -- Booking details (if known)
  booking_data JSONB DEFAULT '{}', -- Examples:
  /*
    {
      "booking_id": "BK-12345",
      "lead_time_days": 45,
      "length_of_stay": 7,
      "number_of_guests": 4,
      "booking_channel": "direct",
      "booking_date": "2024-05-01",
      "check_in": "2024-06-15",
      "check_out": "2024-06-22",
      "revenue": 315.00
    }
  */

  -- Season reference (optional, for quick filtering)
  season_id UUID REFERENCES seasonal_periods(id) ON DELETE SET NULL,
  season_name TEXT, -- Denormalized for performance

  -- Minimum stay requirement
  min_stay_nights INTEGER DEFAULT 1,

  -- Revenue metrics
  revenue DECIMAL(10, 2), -- Actual revenue earned (if booked)
  adr DECIMAL(10, 2), -- Average Daily Rate

  -- Reference to enrichment data (KEY FOR CORRELATION!)
  enrichment_date DATE NOT NULL, -- Usually same as 'date', but can differ for check-in vs. stay dates

  -- Import metadata
  source TEXT DEFAULT 'csv_upload', -- csv_upload, api_import, manual_entry
  source_file_id UUID, -- If from CSV upload
  import_batch_id UUID, -- For bulk operations

  -- Custom fields (campsite-specific)
  custom_data JSONB DEFAULT '{}', -- ANY additional fields from their CSV

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(property_id, accommodation_type_id, date),
  CONSTRAINT valid_occupancy CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100)
);

-- Indexes for performance (CRITICAL!)
CREATE INDEX idx_daily_pricing_property_date ON daily_pricing(property_id, date);
CREATE INDEX idx_daily_pricing_accommodation ON daily_pricing(accommodation_type_id);
CREATE INDEX idx_daily_pricing_enrichment ON daily_pricing(enrichment_date);
CREATE INDEX idx_daily_pricing_season ON daily_pricing(season_id);
CREATE INDEX idx_daily_pricing_availability ON daily_pricing(property_id, availability_status, date);

-- Partial index for occupied dates only
CREATE INDEX idx_daily_pricing_occupied ON daily_pricing(property_id, date)
  WHERE availability_status = 'occupied';
```

**Why this is powerful**:
- `pricing_data` JSONB: ANY pricing structure fits
- `booking_data` JSONB: ANY booking details fit
- `custom_data` JSONB: ANY extra CSV columns fit
- Works for ANY campsite's data format!

---

### 5. ENRICHMENT DATA TABLE (Shared)

**One record per date per location** - no duplication!

```sql
CREATE TABLE enrichment_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Location (rounded to 2 decimals for clustering nearby properties)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_hash TEXT GENERATED ALWAYS AS (
    ROUND(latitude::numeric, 2)::text || ',' || ROUND(longitude::numeric, 2)::text
  ) STORED, -- Groups properties within ~1km

  -- Date
  date DATE NOT NULL,

  -- Weather data
  temperature DECIMAL(5, 2), -- Celsius
  temperature_min DECIMAL(5, 2),
  temperature_max DECIMAL(5, 2),
  feels_like DECIMAL(5, 2),
  precipitation DECIMAL(6, 2), -- mm
  rain DECIMAL(6, 2), -- mm
  snow DECIMAL(6, 2), -- mm
  humidity INTEGER, -- 0-100%
  wind_speed DECIMAL(5, 2), -- km/h
  wind_direction INTEGER, -- degrees
  cloud_cover INTEGER, -- 0-100%
  sunshine_hours DECIMAL(5, 2),
  uv_index DECIMAL(3, 1),
  weather_code INTEGER,
  weather_condition TEXT, -- clear, cloudy, rainy, etc.
  weather_description TEXT, -- Partly cloudy

  -- Holiday data
  is_holiday BOOLEAN DEFAULT FALSE,
  holiday_name TEXT,
  holiday_type TEXT, -- national, regional, local, religious
  holiday_country TEXT,
  is_school_holiday BOOLEAN DEFAULT FALSE, -- Important for camping!
  school_holiday_zone TEXT, -- A, B, C (France) or country code

  -- Temporal features (automatically computed)
  day_of_week INTEGER, -- 0 = Monday, 6 = Sunday
  day_name TEXT,
  week_of_year INTEGER,
  month INTEGER,
  month_name TEXT,
  quarter INTEGER,
  year INTEGER,
  is_weekend BOOLEAN,
  is_long_weekend BOOLEAN, -- Friday-Monday with Monday holiday
  season TEXT, -- spring, summer, autumn, winter (meteorological)

  -- Local events (future enhancement)
  local_events JSONB DEFAULT '[]', -- Array of events on this date
  /*
    [
      {"name": "Music Festival", "type": "festival", "impact": "high"},
      {"name": "Market Day", "type": "market", "impact": "medium"}
    ]
  */

  -- Data quality
  enrichment_status TEXT DEFAULT 'pending', -- pending, enriched, partial, failed
  enriched_at TIMESTAMP WITH TIME ZONE,
  enrichment_sources JSONB DEFAULT '{}', -- Which APIs provided data
  /*
    {
      "weather": "open-meteo",
      "holidays": "calendarific",
      "events": "manual"
    }
  */

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(location_hash, date)
);

-- Indexes (CRITICAL for joins!)
CREATE INDEX idx_enrichment_location_date ON enrichment_data(location_hash, date);
CREATE INDEX idx_enrichment_date ON enrichment_data(date);
CREATE INDEX idx_enrichment_location ON enrichment_data(latitude, longitude);
CREATE INDEX idx_enrichment_status ON enrichment_data(enrichment_status);

-- GiST index for geospatial queries (find enrichment data near a property)
CREATE INDEX idx_enrichment_location_gist ON enrichment_data
  USING GIST (point(longitude, latitude));
```

**How correlation works**:

1. Property at `lat: 43.12, lon: 5.45` uploads pricing data for June 1-30, 2024
2. System creates/finds `enrichment_data` records for location `43.12, 5.45` for each date
3. `daily_pricing.enrichment_date` points to June 1, June 2, etc.
4. Query: "Show me all days where temp > 30°C and occupancy > 80%"
   ```sql
   SELECT dp.date, dp.occupancy_rate, e.temperature
   FROM daily_pricing dp
   JOIN enrichment_data e ON
     dp.enrichment_date = e.date AND
     ROUND(dp.property_latitude::numeric, 2) = ROUND(e.latitude::numeric, 2) AND
     ROUND(dp.property_longitude::numeric, 2) = ROUND(e.longitude::numeric, 2)
   WHERE e.temperature > 30 AND dp.occupancy_rate > 80
   ```

**Why this is genius**:
- ✅ One enrichment record per date/location (no duplication!)
- ✅ Multiple properties in same area share enrichment data
- ✅ Weather data fetched once, used by all
- ✅ Easy to add new enrichment types (events, festivals, etc.)

---

### 6. SOURCE FILES TABLE

Track CSV uploads and imports.

```sql
CREATE TABLE source_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- File info
  original_filename TEXT NOT NULL,
  file_size BIGINT, -- bytes
  file_hash TEXT, -- SHA256 for deduplication

  -- Data info
  total_rows INTEGER,
  imported_rows INTEGER,
  failed_rows INTEGER,
  date_range_start DATE,
  date_range_end DATE,

  -- Column mapping (stores how CSV columns mapped to schema)
  column_mapping JSONB DEFAULT '{}', -- Example:
  /*
    {
      "detected_columns": ["Date", "Accommodation", "Price", "Bookings"],
      "mappings": {
        "Date": "date",
        "Accommodation": "accommodation_type",
        "Price": "price",
        "Bookings": "bookings_count"
      },
      "unmapped_columns": ["Internal_Code"], // Stored in custom_data
      "confidence": 0.95
    }
  */

  -- Import status
  import_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  import_batch_id UUID, -- Groups multiple files imported together
  error_log JSONB DEFAULT '[]', -- Array of errors during import

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

CREATE INDEX idx_source_files_property ON source_files(property_id);
CREATE INDEX idx_source_files_user ON source_files(user_id);
CREATE INDEX idx_source_files_status ON source_files(import_status);
CREATE INDEX idx_source_files_batch ON source_files(import_batch_id);
```

---

### 7. COMPETITOR TABLES (from your selection)

Updated to reference enrichment_data:

```sql
-- Competitors (already well-designed!)
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL, -- Link to user's property
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Competitor info
  campsite_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,

  -- Location
  address TEXT,
  town TEXT,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_km DECIMAL(6, 2),

  -- Monitoring
  is_monitoring BOOLEAN DEFAULT TRUE,
  scrape_frequency TEXT DEFAULT 'daily', -- daily, weekly, manual

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(property_id, campsite_id)
);

-- Competitor pricing with enrichment reference
CREATE TABLE competitor_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,

  -- Pricing data
  date DATE NOT NULL,
  accommodation_type TEXT, -- May not match user's types
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'EUR',
  occupancy INTEGER DEFAULT 4, -- Pricing for X people

  -- Availability
  availability TEXT CHECK (availability IN ('available', 'limited', 'unavailable')),
  min_stay INTEGER,

  -- Pricing details (flexible)
  pricing_details JSONB DEFAULT '{}',

  -- Reference to enrichment data (KEY!)
  enrichment_date DATE NOT NULL, -- Links to same enrichment_data

  -- Scraping metadata
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source_url TEXT,

  UNIQUE(competitor_id, date, accommodation_type, occupancy)
);

CREATE INDEX idx_competitor_pricing_date ON competitor_pricing(competitor_id, date);
CREATE INDEX idx_competitor_pricing_enrichment ON competitor_pricing(enrichment_date);
```

**Now you can query**: "Show my occupancy vs. competitor prices on sunny days"
```sql
SELECT
  dp.date,
  dp.occupancy_rate AS my_occupancy,
  cp.price AS competitor_price,
  e.temperature,
  e.weather_condition
FROM daily_pricing dp
JOIN enrichment_data e ON dp.enrichment_date = e.date
JOIN competitor_pricing cp ON cp.enrichment_date = e.date
WHERE e.weather_condition = 'sunny'
  AND dp.property_id = 'my-property-id'
```

---

## HOW IT WORKS: UNIVERSAL WORKFLOW

### Scenario: Campsite A uploads their data

**Step 1: Property Setup**
```sql
-- User creates their property
INSERT INTO properties (user_id, name, latitude, longitude)
VALUES ('user-123', 'Camping Les Pins', 43.296482, 5.374658);
```

**Step 2: Define Accommodation Types**
```sql
-- They define THEIR accommodation types
INSERT INTO accommodation_types (property_id, name, category, capacity_people)
VALUES
  ('prop-id', 'Luxury Mobile Home', 'mobile_home', 6),
  ('prop-id', 'Standard Pitch', 'pitch', 6),
  ('prop-id', 'Safari Tent', 'glamping', 4);
```

**Step 3: Upload CSV**
```
Date,Accommodation,Price,Bookings
2024-06-01,Luxury Mobile Home,180,1
2024-06-01,Standard Pitch,45,3
2024-06-01,Safari Tent,90,2
```

**Step 4: CSV Mapper (Intelligent)**
- Detects: "Date" → `date`, "Accommodation" → `accommodation_type`, "Price" → `price`, "Bookings" → `bookings_count`
- Creates `daily_pricing` records
- Sets `enrichment_date` = `date`

**Step 5: Enrichment (Automatic)**
- System checks: "Does `enrichment_data` exist for `lat: 43.30, lon: 5.37, date: 2024-06-01`?"
- If NO: Fetch weather from Open-Meteo, holidays from Calendarific → Create record
- If YES: Reuse existing record (maybe from nearby campsite!)
- Link: `daily_pricing.enrichment_date` → `enrichment_data.date`

**Step 6: Query & Analyze**
```sql
-- User can now analyze: "How did weather affect bookings?"
SELECT
  e.date,
  e.temperature,
  e.weather_condition,
  SUM(dp.bookings_count) as total_bookings,
  AVG(dp.occupancy_rate) as avg_occupancy
FROM daily_pricing dp
JOIN enrichment_data e ON
  dp.enrichment_date = e.date AND
  e.location_hash = (SELECT ROUND(latitude::numeric, 2)::text || ',' || ROUND(longitude::numeric, 2)::text FROM properties WHERE id = dp.property_id)
WHERE dp.property_id = 'my-property-id'
  AND dp.date BETWEEN '2024-06-01' AND '2024-08-31'
GROUP BY e.date, e.temperature, e.weather_condition
ORDER BY e.date;
```

---

### Scenario: Campsite B (completely different data)

**Their CSV:**
```
CheckIn,UnitType,WeeklyRate,Guests,Channel
15/06/2024,Premium Caravan,850,4,Booking.com
22/06/2024,Budget Cabin,420,2,Direct
```

**System handles it:**
1. CSV Mapper detects: "CheckIn" → `date`, "UnitType" → `accommodation_type`, "WeeklyRate" → `price`
2. Stores extra fields in `custom_data`: `{"guests": 4, "channel": "Booking.com"}`
3. Creates their own `accommodation_types`: "Premium Caravan", "Budget Cabin"
4. Enrichment works exactly the same way (by date + location)

**Universal schema adapts to BOTH campsites with ZERO code changes!**

---

## SUMMARY: WHY THIS IS UNIVERSAL

| Feature | How It's Universal |
|---------|-------------------|
| **Accommodation Types** | User-defined, stored in `accommodation_types` table |
| **Pricing Structure** | Flexible JSONB in `pricing_data` field |
| **Seasons** | User-defined in `seasonal_periods` table |
| **CSV Columns** | Intelligent mapper + `custom_data` JSONB for extras |
| **Enrichment** | One record per date/location, shared across properties |
| **Booking Details** | Flexible JSONB in `booking_data` field |
| **Custom Fields** | JSONB columns accept ANY additional data |

**Any campsite can use this schema without modifications!**

---

## NEXT: IMPLEMENTATION

See:
1. `backend/migrations/universal-campsite-schema.sql` - Full SQL migration
2. `backend/services/universalCSVMapper.ts` - Smart CSV mapping
3. `backend/services/enrichmentServiceV2.ts` - Proper date correlation
4. `backend/types/universal-schema.types.ts` - TypeScript types

