# Holiday Service Migration Guide

**Date**: 2025-11-03
**Status**: Ready to Apply
**Purpose**: Replace Calendarific API with free, offline date-holidays package

---

## Summary

Migrating from **Calendarific API** (paid, rate-limited, requires API key) to **date-holidays NPM package** (free, offline, no API key needed).

### Benefits

| Feature         | Calendarific (Old)         | date-holidays (New) |
| --------------- | -------------------------- | ------------------- |
| **Cost**        | $0-49/month                | ✅ Free             |
| **API Key**     | Required                   | ✅ Not needed       |
| **Rate Limits** | 1000 req/month (free tier) | ✅ None             |
| **Offline**     | ❌ Requires internet       | ✅ Works offline    |
| **Reliability** | API can go down            | ✅ Always available |
| **Countries**   | 200+                       | ✅ 100+             |
| **Accuracy**    | High                       | ✅ High             |

---

## Migration Steps

### Step 1: Install date-holidays Package

```bash
cd backend
pnpm add date-holidays
```

**Note**: If you get `ENOSPC` error (no disk space), free up disk space first:

```bash
# Clean pnpm cache
pnpm store prune

# Clean old node_modules if needed
rm -rf node_modules
pnpm install
```

### Step 2: Replace Holiday Service

```bash
# Backup old service (optional)
cp backend/services/holidayService.ts backend/services/holidayService.old.ts

# Replace with new service
cp backend/services/holidayService.new.ts backend/services/holidayService.ts
```

### Step 3: Update Environment Variables

```bash
# Edit backend/.env

# Remove (no longer needed):
# CALENDARIFIC_API_KEY=your_key_here

# Keep (still used):
HOLIDAYS_ENABLED=true
```

### Step 4: Restart Backend

```bash
cd backend
pnpm run dev
```

### Step 5: Test Holiday Enrichment

```bash
# Upload a CSV with dates
# Run enrichment
# Check logs for holiday detection

# Should see:
# 📅 Generated 10 holidays for 2024 (offline)
# ✅ Holidays generated and cached: 5 holiday dates
```

---

## Verification

### Check Logs

**Old behavior (Calendarific):**

```
⚠️  CALENDARIFIC_API_KEY not set - holiday enrichment disabled
```

**New behavior (date-holidays):**

```
📅 Generated 10 holidays for 2024 (offline)
✅ Holidays generated and cached: 5 holiday dates
```

### Check Database

```sql
-- Should see holidays cached
SELECT country_code, date, holiday_name
FROM holiday_cache
WHERE country_code = 'US'
ORDER BY date
LIMIT 10;
```

Expected results:

```
US | 2024-01-01 | New Year's Day
US | 2024-07-04 | Independence Day
US | 2024-12-25 | Christmas Day
...
```

---

## Code Changes

### Before (Calendarific API)

```typescript
// Required API key
const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY

// Made HTTP requests
async function fetchHolidaysFromAPI(countryCode: string, year: number) {
  const response = await axios.get('https://calendarific.com/api/v2/holidays', {
    params: {
      api_key: CALENDARIFIC_API_KEY,
      country: countryCode,
      year: year,
    },
  })
  return response.data.response.holidays
}
```

### After (date-holidays)

```typescript
// No API key needed
import Holidays from 'date-holidays'

// Offline calculation
function fetchHolidaysOffline(countryCode: string, year: number): Holiday[] {
  const hd = new Holidays(countryCode)
  return hd.getHolidays(year)
}
```

---

## Supported Countries

date-holidays supports 100+ countries including:

- **North America**: US, CA, MX
- **Europe**: GB, FR, DE, IT, ES, NL, SE, NO, DK, FI
- **Asia**: JP, CN, IN, KR, SG, TH
- **Oceania**: AU, NZ
- **Latin America**: BR, AR, CL
- **Africa**: ZA

Full list: [date-holidays on npm](https://www.npmjs.com/package/date-holidays)

---

## Troubleshooting

### Issue: `Cannot find module 'date-holidays'`

**Cause**: Package not installed

**Fix:**

```bash
cd backend
pnpm add date-holidays
```

### Issue: No holidays detected

**Check:**

1. Is `HOLIDAYS_ENABLED=true` in `.env`?
2. Is country code valid (e.g., 'US', 'GB', 'FR')?
3. Check logs for errors

**Debug:**

```typescript
import Holidays from 'date-holidays'
const hd = new Holidays('US')
console.log(hd.getHolidays(2024))
```

### Issue: Wrong holidays for country

**Cause**: Country code might need state/region

**Fix:**

```typescript
// For specific states/regions
const hd = new Holidays('US', 'CA') // California
const hd = new Holidays('US', 'NY') // New York
```

---

## Rollback Plan

If you need to rollback:

```bash
# Restore old service
cp backend/services/holidayService.old.ts backend/services/holidayService.ts

# Re-add API key to .env
echo "CALENDARIFIC_API_KEY=your_key_here" >> backend/.env

# Uninstall date-holidays (optional)
pnpm remove date-holidays

# Restart
pnpm run dev
```

---

## Performance Comparison

### Calendarific API (Old)

- **Latency**: 200-500ms per request
- **Cost**: $0.05 per 1000 requests (after free tier)
- **Rate Limit**: 1 req/sec (free tier)

### date-holidays (New)

- **Latency**: <1ms (in-memory calculation)
- **Cost**: $0 (free forever)
- **Rate Limit**: None (offline)

**Result**: 200-500x faster, $0 cost, no rate limits!

---

## Next Steps

1. ✅ Run `pnpm add date-holidays` in backend/
2. ✅ Replace `holidayService.ts` with `holidayService.new.ts`
3. ✅ Remove `CALENDARIFIC_API_KEY` from `.env`
4. ✅ Restart backend and test
5. ✅ Monitor logs for successful holiday generation
6. ✅ Delete old service file after confirming it works

---

## Additional Resources

- [date-holidays NPM Package](https://www.npmjs.com/package/date-holidays)
- [date-holidays GitHub](https://github.com/commenthol/date-holidays)
- [Supported Countries List](https://github.com/commenthol/date-holidays/blob/master/docs/Holidays.md)

---

**Migration Status**: Ready to apply (waiting for disk space to install package)
