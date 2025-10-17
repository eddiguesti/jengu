# Task: Remove API Key Exposure from Frontend

**Priority**: HIGH - Security Issue
**Estimated Effort**: 4-6 hours
**Status**: Not Started
**Created**: 2025-10-17

## Problem Statement

Four frontend services are currently making direct API calls with exposed API keys that get baked into the production JavaScript bundle. This allows anyone with DevTools to steal the keys and use them for their own purposes, leading to:

- Unauthorized API usage costs
- Potential quota exhaustion
- Security vulnerabilities
- Especially problematic for Anthropic Claude API (expensive per-token pricing)

## Current State

### ✅ Already Secure
- **Supabase**: Using anon key (intentionally public, protected by RLS)
- **Weather API**: Already proxied through backend (`/api/weather/*`)
- **Database Operations**: All go through backend API

### ❌ Security Issues (API Keys Exposed)

1. **Anthropic Claude API** (`frontend/src/lib/api/services/assistant.ts`)
   - Exposes: `VITE_ANTHROPIC_API_KEY`
   - Backend route exists: `/api/assistant/message` (server.ts:674)
   - Frontend functions:
     - `sendMessage()` - Streaming chat with context
     - `getQuickSuggestion()` - Non-streaming quick insights
     - `analyzePricingData()` - Batch analysis of historical data
     - `generatePricingRecommendations()` - Date-specific recommendations
   - **Gap**: Backend only supports `sendMessage()`, missing 3 other functions

2. **Calendarific API** (`frontend/src/lib/api/services/holidays.ts`)
   - Exposes: `VITE_CALENDARIFIC_API_KEY`
   - Backend route exists: `/api/holidays` (server.ts:942)
   - Frontend functions:
     - `getHolidays(countryCode, year)` - Fetch holidays for country/year
     - `getUpcomingHolidays(countryCode, daysAhead)` - Fetch next N days
   - **Status**: Backend route matches, just needs frontend refactor

3. **Mapbox Geocoding API** (`frontend/src/lib/api/services/geocoding.ts`)
   - Exposes: `VITE_MAPBOX_API_KEY`
   - Backend routes exist: `/api/geocoding/forward`, `/api/geocoding/reverse` (server.ts:975, 1065)
   - Frontend functions:
     - `geocodeAddress(address)` - Address to coordinates
     - `reverseGeocode(lat, lon)` - Coordinates to address
     - `searchPlaces(query, types, limit)` - Autocomplete search
   - **Gap**: Backend missing `searchPlaces` autocomplete functionality
   - **Note**: Backend uses free Nominatim with Mapbox fallback (good!)

4. **ScraperAPI** (`frontend/src/lib/api/services/competitor.ts`)
   - Exposes: `VITE_SCRAPER_API_KEY`
   - Backend route exists: `/api/competitor/scrape` (server.ts:1156)
   - Frontend functions:
     - `scrapeCompetitorPrices(config)` - Scrapes multiple platforms
   - **Status**: Backend exists but frontend has complex logic that needs review

## Implementation Plan

### Phase 1: Backend Route Audit & Enhancement

#### 1.1 Anthropic Assistant API
**File**: `backend/server.ts`

Add missing endpoints:

```typescript
// Quick suggestion endpoint (non-streaming)
app.post('/api/assistant/quick-suggestion', async (req, res) => {
  // Accept context object
  // Call Claude with max_tokens: 256
  // Return single suggestion (2-3 sentences)
})

// Pricing data analysis endpoint
app.post('/api/assistant/analyze-pricing', async (req, res) => {
  // Accept: { dates, prices, occupancy, weather, events }
  // Call Claude with max_tokens: 2048
  // Return analysis insights
})

// Pricing recommendations endpoint
app.post('/api/assistant/pricing-recommendations', async (req, res) => {
  // Accept: { dates, context }
  // Call Claude with max_tokens: 4096
  // Return JSON with date → { price, reasoning }
})
```

**Existing route**: `/api/assistant/message` already handles streaming chat correctly.

#### 1.2 Geocoding API
**File**: `backend/server.ts`

Add places search endpoint:

```typescript
// Place search/autocomplete endpoint
app.get('/api/geocoding/search', async (req, res) => {
  // Accept: { query, types, limit }
  // Try Nominatim first (free): https://nominatim.openstreetmap.org/search
  // Fallback to Mapbox if Nominatim fails
  // Return array of location suggestions
})
```

**Existing routes**: `/api/geocoding/forward` and `/api/geocoding/reverse` already correct.

#### 1.3 Holidays API
**Status**: Backend route complete, no changes needed.

**Existing route**: `/api/holidays` supports country/year queries.

#### 1.4 Competitor Scraping API
**Status**: Backend route exists, but needs review.

**Action**: Review if the current backend route at `/api/competitor/scrape` supports all functionality needed by `scrapeCompetitorPrices()`. The frontend has complex platform-specific logic that might need to move to backend.

### Phase 2: Frontend Service Refactoring

Use `frontend/src/lib/api/services/weather.ts` as the template for all refactors.

#### 2.1 Assistant Service Refactor
**File**: `frontend/src/lib/api/services/assistant.ts`

Changes:
- Remove all direct `fetch('https://api.anthropic.com/...')` calls
- Remove `VITE_ANTHROPIC_API_KEY` usage
- Change to `fetch('http://localhost:3001/api/assistant/...')`
- Update functions:
  - `sendMessage()` → `POST /api/assistant/message`
  - `getQuickSuggestion()` → `POST /api/assistant/quick-suggestion`
  - `analyzePricingData()` → `POST /api/assistant/analyze-pricing`
  - `generatePricingRecommendations()` → `POST /api/assistant/pricing-recommendations`
- Remove `testConnection()` function (backend handles auth)

#### 2.2 Holidays Service Refactor
**File**: `frontend/src/lib/api/services/holidays.ts`

Changes:
- Remove direct `fetch('https://calendarific.com/...')` calls
- Remove `VITE_CALENDARIFIC_API_KEY` usage
- Change to `fetch('http://localhost:3001/api/holidays')`
- Update functions:
  - `getHolidays()` → `GET /api/holidays?country=XX&year=YYYY`
  - `getUpcomingHolidays()` → Fetch current + next year, filter client-side
- Keep helper functions (isHoliday, getHolidayPeriods, etc.) - they're client-side only
- Remove `testCalendarificConnection()` function

#### 2.3 Geocoding Service Refactor
**File**: `frontend/src/lib/api/services/geocoding.ts`

Changes:
- Remove all direct `fetch('https://api.mapbox.com/...')` calls
- Remove `VITE_MAPBOX_API_KEY` usage
- Change to `fetch('http://localhost:3001/api/geocoding/...')`
- Update functions:
  - `geocodeAddress()` → `GET /api/geocoding/forward?address=XXX`
  - `reverseGeocode()` → `GET /api/geocoding/reverse?latitude=XX&longitude=YY`
  - `searchPlaces()` → `GET /api/geocoding/search?query=XX&types=XX&limit=N`
- Keep utility functions (calculateDistance, areValidCoordinates, etc.)
- Remove `testMapboxConnection()` function
- Remove `getMockLocation()` helper (backend handles fallbacks)

#### 2.4 Competitor Service Refactor
**File**: `frontend/src/lib/api/services/competitor.ts`

Changes:
- Remove direct `fetch('http://api.scraperapi.com/...')` calls
- Remove `VITE_SCRAPER_API_KEY` usage
- Change to `fetch('http://localhost:3001/api/competitor/scrape')`
- **Decision needed**: Keep platform logic (buildTargetUrls, extractPricesFromHTML) in frontend or move to backend?
  - **Recommendation**: Move to backend for better security and rate limiting
- Update `scrapeCompetitorPrices()` → `POST /api/competitor/scrape` with config object
- Keep analysis functions (analyzeCompetitorPrices, getPriceRecommendation, etc.) - they're client-side only
- Remove `testScraperConnection()` function
- Keep `getMockCompetitorPrices()` as fallback

### Phase 3: Environment Variables Cleanup

#### 3.1 Remove from Frontend
**File**: `frontend/.env.example`

Remove these lines:
```bash
# REMOVE THESE - API keys should NEVER be in frontend
# VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
# VITE_CALENDARIFIC_API_KEY=your_calendarific_api_key_here
# VITE_MAPBOX_API_KEY=your_mapbox_token_here
# VITE_SCRAPER_API_KEY=your_scraper_api_key_here
```

Keep these (they're intentionally public):
```bash
# Supabase Configuration (anon key is public by design)
VITE_SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
VITE_SUPABASE_ANON_KEY=key

# Backend API URL
VITE_API_URL=http://localhost:3001/api

# Feature Flags
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_COMPETITOR_PRICING=true
VITE_ENABLE_WEATHER_DATA=true
VITE_ENABLE_HOLIDAYS=true
VITE_ENABLE_GEOCODING=true
VITE_ENABLE_MAKCORPS=true

# App Configuration
VITE_APP_NAME=Jengu Dynamic Pricing
VITE_APP_VERSION=1.0.0
```

#### 3.2 Ensure Backend Has Keys
**File**: `backend/.env`

Verify these exist (don't commit!):
```bash
ANTHROPIC_API_KEY=sk-ant-...
CALENDARIFIC_API_KEY=...
MAPBOX_TOKEN=pk....
SCRAPERAPI_KEY=...
OPENWEATHER_API_KEY=...
```

### Phase 4: Testing

#### 4.1 Backend API Testing
Test each new endpoint with curl or Postman:

```bash
# Assistant endpoints
curl -X POST http://localhost:3001/api/assistant/quick-suggestion \
  -H "Content-Type: application/json" \
  -d '{"context":{"businessName":"Test Hotel"}}'

curl -X POST http://localhost:3001/api/assistant/analyze-pricing \
  -H "Content-Type: application/json" \
  -d '{"dates":["2024-01-15"],"prices":[150],"occupancy":[80]}'

curl -X POST http://localhost:3001/api/assistant/pricing-recommendations \
  -H "Content-Type: application/json" \
  -d '{"dates":["2024-01-15"],"context":{"avgPrice":150}}'

# Geocoding search
curl "http://localhost:3001/api/geocoding/search?query=paris&limit=5"

# Holidays (existing)
curl "http://localhost:3001/api/holidays?country=US&year=2024"

# Competitor scrape (existing)
curl -X POST http://localhost:3001/api/competitor/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.booking.com/..."}'
```

#### 4.2 Frontend Integration Testing
1. Start backend: `cd backend && pnpm run dev`
2. Start frontend: `cd frontend && pnpm run dev`
3. Test each feature that uses the refactored services:
   - AI Assistant chat (Insights page)
   - Quick pricing suggestions
   - Geocoding in Settings page
   - Holiday data in enrichment
   - Competitor pricing scraping

#### 4.3 Build Testing
1. Build frontend: `cd frontend && pnpm run build`
2. Inspect bundle: Search for exposed API keys
   ```bash
   # Should return ZERO matches
   grep -r "sk-ant-" frontend/dist/
   grep -r "VITE_ANTHROPIC_API_KEY" frontend/dist/
   grep -r "VITE_CALENDARIFIC" frontend/dist/
   grep -r "VITE_MAPBOX_API_KEY" frontend/dist/
   grep -r "VITE_SCRAPER_API" frontend/dist/
   ```
3. Only Supabase anon key should be present (this is intentional)

### Phase 5: Documentation Updates

#### 5.1 Update CLAUDE.md
**File**: `docs/developer/ARCHITECTURE.md` or `CLAUDE.md`

Add section about API key security:
```markdown
## API Key Security

**Critical Rule**: NEVER expose API keys in the frontend.

- All external API calls must go through backend proxies
- Frontend should only have:
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public by design)
  - `VITE_API_URL` (backend endpoint)
  - Feature flags (`VITE_ENABLE_*`)
  - App config (`VITE_APP_*`)

- Backend `.env` contains all sensitive API keys:
  - `ANTHROPIC_API_KEY`
  - `CALENDARIFIC_API_KEY`
  - `MAPBOX_TOKEN`
  - `SCRAPERAPI_KEY`
  - `OPENWEATHER_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Example**: Weather service (`frontend/src/lib/api/services/weather.ts`) is the gold standard for this pattern.
```

## Success Criteria

- [ ] All 4 frontend services refactored to use backend proxies
- [ ] No API keys visible in frontend bundle (verified with grep)
- [ ] All AI assistant functions work through backend
- [ ] Geocoding autocomplete works through backend
- [ ] Holiday fetching works through backend
- [ ] Competitor scraping works through backend
- [ ] Frontend `.env.example` cleaned of sensitive keys
- [ ] Backend routes fully tested with curl
- [ ] Frontend features tested in browser
- [ ] Documentation updated

## Risk Assessment

**Low Risk** - This is a refactoring task that:
- Doesn't change user-facing functionality
- Has existing working template (weather service)
- Backend routes already mostly exist
- Can be tested incrementally per service

**Rollback Plan**:
- Keep old code commented out initially
- Test each service individually before removing old code
- Git commit after each service is refactored and tested

## Related Files

### Backend Files to Modify
- `backend/server.ts` - Add 4 new endpoints (assistant x3, geocoding x1)

### Frontend Files to Modify
- `frontend/src/lib/api/services/assistant.ts` - Refactor to use backend
- `frontend/src/lib/api/services/holidays.ts` - Refactor to use backend
- `frontend/src/lib/api/services/geocoding.ts` - Refactor to use backend
- `frontend/src/lib/api/services/competitor.ts` - Refactor to use backend
- `frontend/.env.example` - Remove sensitive keys

### Template Reference
- `frontend/src/lib/api/services/weather.ts` - Use as refactoring template

### Documentation to Update
- `CLAUDE.md` or `docs/developer/ARCHITECTURE.md` - Add API security section

## Notes

- The Supabase anon key exposure is **intentional and secure** - it's protected by Row-Level Security policies
- Weather service already implements the correct pattern - use it as a reference
- Backend already uses Nominatim (free) with Mapbox fallback for geocoding - this is good architecture
- Consider adding backend rate limiting per user if Anthropic costs become an issue
- This task should be completed before any production deployment

## Timeline

- **Phase 1** (Backend): 1-2 hours
- **Phase 2** (Frontend): 2-3 hours
- **Phase 3** (Env Cleanup): 15 minutes
- **Phase 4** (Testing): 1 hour
- **Phase 5** (Documentation): 30 minutes

**Total Estimated Time**: 4-6 hours
