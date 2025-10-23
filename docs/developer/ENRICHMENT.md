# Enrichment System Documentation

**Last Updated**: 2025-10-23
**Status**: Production Ready
**Related**: [ARCHITECTURE.md](./ARCHITECTURE.md), [Task3 Status](../TASK3-ENRICHMENT-CACHING-STATUS.md)

## Overview

The enrichment system enhances pricing data with external context (weather, holidays, temporal features) to improve pricing intelligence and analytics. It runs asynchronously after CSV uploads and implements caching, idempotency, and parallel processing for performance.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Enrichment Pipeline                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Temporal   │  │   Weather    │  │   Holidays   │      │
│  │  Enrichment  │  │  Enrichment  │  │  Enrichment  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐       │
│  │          Pricing Data (Supabase)                 │       │
│  │  - temperature, precipitation, weatherCondition  │       │
│  │  - dayOfWeek, month, season, isWeekend          │       │
│  │  - isHoliday, holidayName                        │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │Holiday Cache │        │Weather Cache │                  │
│  │(Calendarific)│        │(Open-Meteo)  │                  │
│  └──────────────┘        └──────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Service Layer

**Location**: `backend/services/`

- **`enrichmentService.ts`**: Main orchestration
- **`weatherCacheService.ts`**: Weather API + caching
- **`holidayService.ts`**: Holiday API + caching

### Database Schema

#### Pricing Data Table

```sql
CREATE TABLE pricing_data (
  id UUID PRIMARY KEY,
  propertyId UUID NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(10, 2),

  -- Weather enrichment
  temperature DECIMAL(5, 2),
  precipitation DECIMAL(6, 2),
  weatherCondition TEXT,
  sunshineHours DECIMAL(4, 2),

  -- Temporal enrichment
  dayOfWeek INTEGER,           -- 0-6 (Sunday-Saturday)
  month INTEGER,                -- 1-12
  season VARCHAR(10),           -- Winter/Spring/Summer/Fall
  isWeekend BOOLEAN,

  -- Holiday enrichment
  isHoliday BOOLEAN,
  holidayName TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Cache Tables

**Holiday Cache**:

```sql
CREATE TABLE holiday_cache (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,   -- e.g., 'US', 'FR'
  date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_type VARCHAR(50),           -- 'National', 'Religious', etc.
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(country_code, date)
);

CREATE INDEX idx_holiday_cache_country_date ON holiday_cache(country_code, date);
CREATE INDEX idx_holiday_cache_date ON holiday_cache(date);
```

**Weather Cache**:

```sql
CREATE TABLE weather_cache (
  id UUID PRIMARY KEY,
  latitude DECIMAL(5, 2) NOT NULL,    -- Rounded to 2dp (~1.1km precision)
  longitude DECIMAL(5, 2) NOT NULL,
  date DATE NOT NULL,
  temperature DECIMAL(5, 2),
  temp_min DECIMAL(5, 2),
  temp_max DECIMAL(5, 2),
  precipitation DECIMAL(6, 2),
  weather_code INT,                   -- WMO weather code
  weather_description TEXT,
  sunshine_hours DECIMAL(4, 2),
  api_source VARCHAR(50) DEFAULT 'open-meteo',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(latitude, longitude, date)
);

CREATE INDEX idx_weather_cache_location_date ON weather_cache(latitude, longitude, date);
CREATE INDEX idx_weather_cache_date ON weather_cache(date);
```

## Enrichment Flow

### 1. Temporal Enrichment

**Purpose**: Add time-based features (no external API needed)

**Process**:

1. Query all pricing data for property
2. Filter rows where `dayOfWeek IS NULL` (idempotent)
3. Calculate temporal features from date:
   - `dayOfWeek`: 0-6 (Sunday-Saturday)
   - `month`: 1-12
   - `season`: Winter/Spring/Summer/Fall (Northern Hemisphere)
   - `isWeekend`: `dayOfWeek === 0 || dayOfWeek === 6`
4. Batch update (100 rows/batch) in parallel
5. Skip already-enriched rows

**Performance**: ~0.1-0.2s per 100 rows

**Code Example**:

```typescript
import { enrichWithTemporalFeatures } from './services/enrichmentService.js'

const result = await enrichWithTemporalFeatures(propertyId, supabaseClient)
console.log(result)
// {
//   enriched: 250,     // New rows enriched
//   skipped: 100,      // Already enriched
//   total: 350,
//   duration: 150      // milliseconds
// }
```

### 2. Weather Enrichment

**Purpose**: Add weather context from historical data

**Process**:

1. Query pricing data for property (include `temperature` to check enrichment)
2. Get date range (min/max dates)
3. Round lat/lng to 2 decimals (~1.1km precision)
4. **Check cache first**:
   - Query `weather_cache` for rounded coords + date range
   - Calculate cache hit rate
5. **If cache < 80%**: Fetch from Open-Meteo API
6. **Cache results**: Upsert to `weather_cache` (ON CONFLICT DO NOTHING)
7. Filter rows where `temperature IS NULL` (idempotent)
8. Batch update (100 rows/batch) in parallel
9. Return metrics (enriched, skipped, duration, cacheHitRate)

**Performance**:

- First run (no cache): ~5-10s per 365 days (API limited)
- Subsequent runs (80%+ cache): ~0.2-0.5s per 365 days

**Code Example**:

```typescript
import { enrichWithWeather } from './services/enrichmentService.js'

const result = await enrichWithWeather(
  propertyId,
  { latitude: 48.8566, longitude: 2.3522 },
  supabaseClient
)
console.log(result)
// {
//   enriched: 300,
//   skipped: 50,
//   total: 350,
//   duration: 2500,
//   cacheHitRate: 0.85   // 85% cache hit
// }
```

### 3. Holiday Enrichment

**Purpose**: Mark holidays for demand forecasting

**Process**:

1. **Check feature flag**: `HOLIDAYS_ENABLED` and API key
2. Query pricing data (include `isHoliday` to check enrichment)
3. Get date range
4. **Check cache first**:
   - Query `holiday_cache` for country + date range
   - If coverage > 50%, use cache only
5. **If cache incomplete**: Fetch from Calendarific API by year
6. **Cache results**: Upsert to `holiday_cache`
7. Filter rows where `isHoliday IS NULL` (idempotent)
8. Batch update (100 rows/batch) in parallel:
   - If holiday exists: `isHoliday = true, holidayName = "Christmas Day"`
   - If no holiday: `isHoliday = false, holidayName = null`
9. Return metrics

**Performance**:

- First run (no cache): ~2-3s per year (API limited)
- Subsequent runs (cached): ~0.2-0.4s

**Code Example**:

```typescript
import { enrichWithHolidays } from './services/enrichmentService.js'

const result = await enrichWithHolidays(
  propertyId,
  'FR', // Country code
  process.env.CALENDARIFIC_API_KEY,
  supabaseClient
)
console.log(result)
// {
//   enriched: 15,      // Holidays found
//   skipped: 335,      // Already enriched
//   total: 350,
//   duration: 1200
// }
```

### 4. Complete Pipeline

**Purpose**: Run all enrichment stages in sequence

**Process**:

1. Always run temporal (no API needed)
2. Run weather if location provided
3. Run holidays if country code provided
4. Aggregate metrics
5. Return summary

**Code Example**:

```typescript
import { enrichPropertyData } from './services/enrichmentService.js'

const result = await enrichPropertyData(
  propertyId,
  {
    location: { latitude: 48.8566, longitude: 2.3522 },
    countryCode: 'FR',
    calendarificApiKey: process.env.CALENDARIFIC_API_KEY,
  },
  supabaseClient
)
console.log(result)
// {
//   success: true,
//   results: {
//     temporal: { enriched: 300, skipped: 50, duration: 150 },
//     weather: { enriched: 280, skipped: 70, duration: 2500, cacheHitRate: 0.85 },
//     holidays: { enriched: 15, skipped: 335, duration: 1200 },
//     summary: {
//       totalDuration: 3850,
//       totalEnriched: 595,
//       cacheHitRate: 0.85
//     }
//   }
// }
```

## Caching Strategy

### Weather Cache

**Key Design**: `(rounded_lat, rounded_lng, date)`

**Coordinate Rounding**:

```typescript
function roundCoordinate(coord: number): number {
  return Math.round(coord * 100) / 100 // 2 decimal precision
}

// Example:
roundCoordinate(48.856614) // 48.86
roundCoordinate(2.352222) // 2.35
```

**Why 2 decimals?**

- Precision: ~1.1km radius
- Coverage: Multiple properties share cache for nearby locations
- Trade-off: Good enough for weather patterns, maximizes cache hits

**Cache Hit Threshold**: 80%

- If cache hit rate ≥ 80%, use cache only (no API call)
- If cache hit rate < 80%, fetch missing dates from API + cache

**Example**:

```
Date range: 2024-01-01 to 2024-12-31 (365 days)
Cached: 310 days (85% hit rate)
→ Use cache only, skip API

Date range: 2024-01-01 to 2024-12-31 (365 days)
Cached: 200 days (55% hit rate)
→ Fetch 165 missing days from API, cache results
```

### Holiday Cache

**Key Design**: `(country_code, date)`

**Cache Completeness Threshold**: 50%

- If coverage > 50% of date range, use cache only
- Otherwise, fetch from API by year

**API Efficiency**:

- Calendarific charges per API call
- Batch fetch entire year (1 API call = 365 days)
- Cache forever (holidays don't change)

**Example**:

```
Date range: 2024-01-01 to 2024-12-31 (365 days)
Cached: 200 days (55% coverage)
→ Use cache only, skip API

Date range: 2024-01-01 to 2024-12-31 (365 days)
Cached: 100 days (27% coverage)
→ Fetch year 2024 from API (1 call), cache all 365 days
```

## Idempotency

**Problem**: Re-running enrichment shouldn't overwrite existing data

**Solution**: Only update NULL fields using Supabase `.is('field', null)` filter

### Implementation

**Weather Enrichment**:

```typescript
// Query includes temperature to check enrichment status
const { data: pricingData } = await supabaseClient
  .from('pricing_data')
  .select('id, date, temperature')
  .eq('propertyId', propertyId)

// Filter enriched rows
if (row.temperature !== null) {
  skippedCount++
  continue
}

// Update only if temperature is null (idempotent guard)
await supabaseClient
  .from('pricing_data')
  .update({ temperature, precipitation, weatherCondition })
  .eq('id', row.id)
  .is('temperature', null) // Key: Prevents overwrites
```

**Holiday Enrichment**:

```typescript
// Check if isHoliday is already set
if (row.isHoliday !== null) {
  skippedCount++
  continue
}

await supabaseClient
  .from('pricing_data')
  .update({ isHoliday: true, holidayName: 'Christmas' })
  .eq('id', row.id)
  .is('isHoliday', null) // Idempotent guard
```

**Benefits**:

- Safe re-runs after failures
- No data loss from duplicate enrichment
- Clear metrics (enriched vs skipped)

## Performance Optimization

### Parallel Batch Updates

**Before (Serial)**:

```typescript
for (const row of batch) {
  await supabaseClient.from('pricing_data').update({...}).eq('id', row.id)
}
// Time: ~1-2s per 100 rows
```

**After (Parallel)**:

```typescript
const updatePromises = batch
  .filter(row => row.temperature === null)
  .map(async row => {
    const { error } = await supabaseClient
      .from('pricing_data')
      .update({...})
      .eq('id', row.id)
      .is('temperature', null)
    return !error
  })

const results = await Promise.allSettled(updatePromises)
// Time: ~0.1-0.2s per 100 rows (5-10x faster)
```

### Performance Metrics

| Operation          | Rows     | Before  | After     | Speedup  |
| ------------------ | -------- | ------- | --------- | -------- |
| Temporal           | 1000     | 10s     | 1s        | 10x      |
| Weather (cached)   | 1000     | 8s      | 1.5s      | 5x       |
| Weather (no cache) | 365      | 30s     | 8s        | 4x       |
| Holidays (cached)  | 1000     | 5s      | 1s        | 5x       |
| **Total Pipeline** | **1000** | **53s** | **11.5s** | **4.6x** |

## Feature Flags

### HOLIDAYS_ENABLED

**Purpose**: Quick rollback if API quota exceeded

**Usage**:

```bash
# .env
HOLIDAYS_ENABLED=false  # Disable holiday enrichment
CALENDARIFIC_API_KEY=your_key_here
```

**Behavior**:

```typescript
import { isHolidayEnrichmentEnabled } from './services/holidayService.js'

if (!isHolidayEnrichmentEnabled()) {
  return { skipped: true, reason: 'Holiday enrichment disabled' }
}
```

**Reasons to disable**:

- API quota exceeded (Calendarific free tier: 1000 req/month)
- API downtime
- Cost management

## API Integration

### Open-Meteo (Weather)

**Provider**: [open-meteo.com](https://open-meteo.com)
**Cost**: Free for historical data
**Limits**: Reasonable fair use
**Data**: Temperature, precipitation, weather codes, sunshine hours

**API Call Example**:

```typescript
const url =
  `https://archive-api.open-meteo.com/v1/archive?` +
  `latitude=${latitude}&longitude=${longitude}` +
  `&start_date=${startDate}&end_date=${endDate}` +
  `&daily=temperature_2m_mean,precipitation_sum,weathercode,sunshine_duration` +
  `&timezone=auto`

const response = await axios.get(url, { timeout: 30000 })
```

### Calendarific (Holidays)

**Provider**: [calendarific.com](https://calendarific.com)
**Cost**: Free tier (1000 req/month), then $9.99/mo
**Limits**: 1000 requests/month (free)
**Data**: Holiday names, types, dates

**API Call Example**:

```typescript
const url = 'https://calendarific.com/api/v2/holidays'
const response = await axios.get(url, {
  params: {
    api_key: calendarificApiKey,
    country: countryCode,
    year: year,
  },
  timeout: 10000,
})
```

## Error Handling

### Graceful Degradation

**Weather API Failure**:

```typescript
try {
  const weatherMap = await fetchWeatherWithCache(...)
} catch (error) {
  console.error('Weather enrichment error:', error.message)
  return {
    enriched: 0,
    error: error.message,
    duration: Date.now() - startTime
  }
}
```

**Holiday API Failure**:

```typescript
if (!isHolidayEnrichmentEnabled()) {
  return {
    skipped: true,
    reason: 'Holiday enrichment disabled or no API key',
  }
}
```

### Retry Strategy

**Not Yet Implemented** (Future Enhancement)

Potential approach:

- Exponential backoff for API failures
- Retry 3 times with 1s, 2s, 4s delays
- Fall back to partial enrichment

## Monitoring

### Log Output

```
🚀 Starting enrichment pipeline for property abc-123...

📆 Starting temporal enrichment...
📊 Enriched 100/1000 rows (100 updated, 0 already enriched)...
✅ Temporal enrichment complete:
   - Updated: 1000 rows
   - Skipped: 0 rows
   - Duration: 1.2s

🌤️  Starting weather enrichment...
📅 Date range: 2024-01-01 to 2024-12-31
📊 Enriched 100/1000 rows (85 updated, 15 already enriched)...
✅ Weather enrichment complete:
   - Updated: 850 rows
   - Skipped: 150 rows
   - Cache hit rate: 92.3%
   - Duration: 2.5s

🎉 Holiday enrichment requested...
📅 Date range: 2024-01-01 to 2024-12-31
📊 Enriched 100/1000 rows (5 holidays, 95 already enriched)...
✅ Holiday enrichment complete:
   - Holidays found: 50 rows
   - Skipped: 950 rows
   - Duration: 1.1s

✅ Enrichment pipeline complete!
   - Total enriched: 1900 rows
   - Total duration: 4.8s
   - Weather cache hit rate: 92.3%
```

### Metrics to Track

- **Enrichment Duration**: Track by property size
- **Cache Hit Rate**: Should be ≥80% after first run
- **API Call Count**: Monitor Calendarific quota
- **Error Rate**: Alert on >5% failures
- **Skipped Row %**: High % = good (idempotency working)

## Troubleshooting

### Common Issues

#### 1. Low Cache Hit Rate

**Symptom**: Cache hit rate < 50%

**Causes**:

- Different coordinate precision
- Date ranges don't overlap
- Cache not populated yet

**Solution**:

```typescript
// Check cache contents
const { data } = await supabaseClient
  .from('weather_cache')
  .select('*')
  .eq('latitude', 48.86)
  .eq('longitude', 2.35)

console.log(`Cached dates: ${data.length}`)
```

#### 2. Holiday Enrichment Disabled

**Symptom**: `{ skipped: true, reason: '...' }`

**Causes**:

- Missing `CALENDARIFIC_API_KEY`
- `HOLIDAYS_ENABLED=false`

**Solution**:

```bash
# Check .env
echo $CALENDARIFIC_API_KEY
echo $HOLIDAYS_ENABLED

# Enable if disabled
export HOLIDAYS_ENABLED=true
```

#### 3. API Quota Exceeded

**Symptom**: Calendarific returns 402 Payment Required

**Solution**:

```bash
# Disable holidays temporarily
export HOLIDAYS_ENABLED=false

# Or upgrade Calendarific plan
# https://calendarific.com/pricing
```

#### 4. Enrichment Takes Too Long

**Symptom**: Pipeline > 30s for 1000 rows

**Causes**:

- No cache (first run)
- API timeouts
- Large batch size

**Solution**:

```typescript
// Reduce batch size if needed
const BATCH_SIZE = 50  // Was 100

// Check API latency
const start = Date.now()
await fetchWeatherFromAPI(...)
console.log(`API latency: ${Date.now() - start}ms`)
```

## Testing

### Unit Tests

**Location**: `backend/test/enrichment.test.ts`

**Coverage**: 23 tests across 6 suites

- Holiday caching (5 tests)
- Weather caching (5 tests)
- Idempotent enrichment (4 tests)
- Enrichment metrics (3 tests)
- Feature flags (3 tests)
- Error handling (3 tests)

**Run Tests**:

```bash
cd backend
pnpm run test enrichment.test.ts
```

### Integration Testing

**Manual Test Flow**:

1. Upload CSV with pricing data
2. Run enrichment pipeline
3. Verify data populated:

```sql
SELECT
  date, price, temperature, precipitation,
  dayOfWeek, isWeekend, isHoliday, holidayName
FROM pricing_data
WHERE propertyId = 'your-property-id'
ORDER BY date
LIMIT 10;
```

4. Re-run enrichment (should skip all rows)
5. Check logs for "skipped" counts

## Future Enhancements

### Potential Improvements

1. **Parallel Enrichment Stages**:
   - Run temporal, weather, holidays concurrently
   - Total time = max(stage_times) instead of sum

2. **Background Job Queue**:
   - Move enrichment to async job queue (BullMQ, etc.)
   - Better error handling and retries

3. **Cache Warming**:
   - Pre-populate cache for common locations
   - Batch fetch future dates during off-peak hours

4. **Additional Data Sources**:
   - Events (concerts, sports) from Predicthq
   - School holidays from custom API
   - Local regulations

5. **Machine Learning Integration**:
   - Use enriched features for demand forecasting
   - Anomaly detection (unusual weather → price spike)

## References

- [Task3 Implementation Status](../TASK3-ENRICHMENT-CACHING-STATUS.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Supabase Security](./SUPABASE_SECURITY.md)
- [Open-Meteo API Docs](https://open-meteo.com/en/docs)
- [Calendarific API Docs](https://calendarific.com/api-documentation)

---

**Generated**: 2025-10-23
**Maintainer**: Engineering Lead
**Status**: Production Ready ✅
