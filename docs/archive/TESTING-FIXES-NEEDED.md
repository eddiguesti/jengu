# Testing Fixes Needed

## Summary
Enrichment is working correctly (59 rows enriched successfully!), but the frontend is experiencing errors due to ID mismatches and missing cache tables.

---

## 1. Enrichment Status 404 Error ✅

**Problem**: Frontend requests `/api/enrichment/status/bbf67c1f-...` (using property ID)
**Reality**: Job ID is `enrich-bbf67c1f-974d-43b4-81e8-e9a834ceefe1-1761995750431`

**Root Cause**: When enrichment job is queued, the backend returns `job_id` but frontend is polling with property ID instead.

**Fix Options**:
1. **Frontend Fix**: Store the returned `job_id` from the enrich API response and use that for status polling
2. **Backend Fix**: Accept property ID in status endpoint and lookup the latest enrichment job for that property

**Recommendation**: Frontend fix (use the job_id from the API response)

---

## 2. File ID Mismatch 404 Error ⚠️

**Problem**: Frontend requests `/api/files/c6400e61-9ae6-45f8-af0a-7e0c55af2748/data`
**Reality**: Uploaded file ID is `bbf67c1f-974d-43b4-81e8-e9a834ceefe1`

**Root Cause**: Frontend is using stale file ID from localStorage or state

**Fix**: Clear frontend state/localStorage and ensure correct property ID is used after upload

---

## 3. Missing Cache Tables ⚠️

**Problem**:
```
Error fetching from weather cache: Could not find the table 'public.weather_cache'
Error fetching from holiday cache: Could not find the table 'public.holiday_cache'
```

**Impact**: Non-critical - enrichment still works, but performance is degraded (no caching)

**Fix**: Run SQL in Supabase:
```bash
# File: backend/prisma/enrichment-cache-tables.sql
# Run in Supabase SQL Editor
```

---

## 4. Pricing Service 500 Error 🔴

**Problem**: `TypeError: fetch failed` when calling pricing microservice

**Root Cause**: Python pricing microservice is not running

**Fix Options**:
1. Start the pricing microservice (if it exists)
2. Disable pricing features temporarily
3. Update endpoint to point to correct service

**Recommendation**: Document that pricing service needs to be started separately

---

## 5. Holiday API 401 Unauthorized ⚠️

**Problem**: `Failed to fetch holidays: Request failed with status code 401`

**Root Cause**: Calendarific API key missing or invalid in `.env`

**Impact**: Holiday enrichment fails (but doesn't block other enrichment)

**Fix**: Add valid `CALENDARIFIC_API_KEY` to `.env` or disable holiday enrichment

---

## Quick Fixes (Priority Order)

### 1. Create Cache Tables (2 minutes)
```sql
-- Run in Supabase SQL Editor
-- File: backend/prisma/enrichment-cache-tables.sql
```

### 2. Fix Frontend Job ID Polling (5 minutes)
Update `frontend/src/components/features/EnrichmentProgress.tsx`:
- Store `job_id` from enrich response
- Use `job_id` for status polling instead of property ID

### 3. Fix File ID Mismatch (1 minute)
- Clear browser localStorage
- Refresh page
- Upload file again

### 4. Document Pricing Service (1 minute)
- Add note that Python pricing service needs to be started
- Provide startup instructions

---

## Current Status

✅ **Working**:
- CSV upload (59 rows)
- Enrichment pipeline (temporal, weather, holidays)
- Analytics job chaining

⚠️ **Issues (Non-blocking)**:
- Cache tables missing (performance impact only)
- Holiday API 401 (holidays not fetched)

🔴 **Blocking Issues**:
- Frontend using wrong IDs (enrichment status, file data)
- Pricing service not running

---

## Next Steps

1. Run cache tables SQL in Supabase
2. Fix frontend to use correct job_id and property_id
3. Document pricing service requirements
4. Optional: Fix Calendarific API key
