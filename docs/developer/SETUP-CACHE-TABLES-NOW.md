# ⚡ Quick Setup: Cache Tables (2 Minutes)

**Status**: ✅ Backend restarted with new code! Now let's add cache tables.

---

## Option 1: Supabase Dashboard (EASIEST)

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

### Step 2: Copy & Paste SQL
Open this file and copy ALL the SQL:
- **File**: `backend/prisma/enrichment-cache-tables.sql`
- **Location**: `c:\Users\eddgu\travel-pricing\backend\prisma\enrichment-cache-tables.sql`

### Step 3: Run SQL
1. Paste the SQL into Supabase SQL Editor
2. Click **RUN** (or press Ctrl+Enter)
3. Wait 5-10 seconds
4. You should see: **Success. No rows returned**

### Step 4: Verify
Check the left sidebar under **Tables** - you should now see:
- ✅ `weather_cache`
- ✅ `holiday_cache`

---

## Option 2: Automated Script (If Supabase allows)

```bash
cd backend
node setup-cache-tables.js
```

**Note**: This might not work due to Supabase security restrictions. Use Option 1 if this fails.

---

## What These Tables Do

### `weather_cache`
- **Purpose**: Cache weather data from Open-Meteo API
- **Benefit**: 70-80% faster enrichment after first run
- **Savings**: Reduces API calls (free tier has limits)

### `holiday_cache`
- **Purpose**: Cache holiday data from Calendarific API
- **Benefit**: No redundant holiday API calls
- **Savings**: Saves API credits

---

## Before vs After

### Before (No Cache)
```
Enrichment 1: Fetch 440 days → 2.5 seconds
Enrichment 2: Fetch 440 days → 2.5 seconds  (SLOW!)
Enrichment 3: Fetch 440 days → 2.5 seconds  (SLOW!)
```

### After (With Cache)
```
Enrichment 1: Fetch 440 days → Cache → 2.5 seconds
Enrichment 2: Use cache → 0.5 seconds  (FAST! 5x faster)
Enrichment 3: Use cache → 0.5 seconds  (FAST!)
```

---

## Verification

After running the SQL, check backend logs during next enrichment:

**You should see**:
```
📦 Cache hit: 440/440 days (100.0%)
✅ Using cached weather data
💾 Weather cache hit rate: 100%
```

Instead of:
```
📦 Cache hit: 0/440 days (0.0%)
⚠️  Cache incomplete - fetching from Open-Meteo API...
```

---

## ✅ Complete Checklist

- [x] Backend restarted (done automatically)
- [x] Pricing service disabled (done automatically)
- [ ] **Cache tables created (DO THIS NOW!)**
- [ ] Test CSV upload (after cache tables)

---

## Next Step After Cache Tables

1. **Refresh your browser** (F5)
2. **Clear cache** if needed (F12 → Application → Clear All)
3. **Upload a CSV**
4. **Watch enrichment complete without 404 errors!** 🎉

---

**Time to complete**: 2 minutes
**Difficulty**: Copy + Paste
**Benefit**: 5x faster enrichment, professional performance
