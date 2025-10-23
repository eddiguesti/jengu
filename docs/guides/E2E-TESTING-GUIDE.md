# End-to-End Testing Guide

This guide provides step-by-step instructions for validating the Jengu pricing platform with real data.

## 🎯 Overview

E2E testing validates that all components work together correctly:

- ✅ Real data flows from upload → database → analytics → pricing
- ✅ No mock/fake data appears anywhere
- ✅ All integrations work (Supabase, APIs, frontend ↔ backend)
- ✅ Performance is acceptable on realistic datasets

## 📋 Prerequisites

### 1. Environment Setup

**Backend** (`.env` file):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key (optional for AI insights)
```

**Frontend** (`.env` file):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Test User Account

Create a test user in Supabase:

- Email: `test@jengu.com`
- Password: `test123456`

### 3. Start Servers

Terminal 1 (Backend):

```bash
cd backend
pnpm run dev
```

Terminal 2 (Frontend):

```bash
cd frontend
pnpm run dev
```

## 🧪 Test Data Generation

Generate realistic test data for all scenarios:

```bash
cd backend
npx tsx test/e2e-test-data.ts
```

This creates test CSV files in `backend/test-data/`:

- `test-standard.csv` - 30 days of data (normal scenario)
- `test-insufficient.csv` - 5 rows (edge case)
- `test-noWeather.csv` - Missing weather columns
- `test-large.csv` - 10,000+ rows (performance test)
- `test-oneYear.csv` - 365 days (full year)

## 🔧 Automated API Tests

Run backend integration tests:

```bash
cd backend

# Set test credentials
export TEST_EMAIL=test@jengu.com
export TEST_PASSWORD=test123456

# Run tests
npx tsx test/api-integration.test.ts
```

**Expected output:**

```
🧪 Starting API Integration Tests

✅ Authentication - Sign in with email/password
✅ GET /api/health - Health check endpoint
✅ GET /api/data/files - Fetch uploaded files
✅ POST /api/pricing/quote - Request pricing quote with validation
✅ POST /api/pricing/quote - Reject invalid request (Zod validation)
✅ POST /api/analytics/revenue-series - Fetch revenue time series
✅ Database - Verify RLS policies allow user access

📊 Test Results Summary
Total: 7 | Passed: 7 | Failed: 0
✅ All tests passed!
```

## 📝 Manual Testing Scenarios

### Scenario 1: Fresh User Journey (Happy Path)

**Goal**: Validate complete data flow from upload to pricing

**Steps**:

1. **Clear browser data**
   - Open DevTools (F12) → Application tab
   - Clear Local Storage and Session Storage
   - Hard refresh (Ctrl+Shift+R)

2. **Login**
   - Navigate to `http://localhost:5173`
   - Sign in with test user credentials
   - Verify redirect to Dashboard

3. **Upload CSV**
   - Navigate to Data page
   - Upload `test-standard.csv` (30 rows)
   - Verify upload progress bar
   - Verify success message

4. **Verify Dashboard**
   - Navigate to Dashboard
   - Check statistics:
     - Total Records: **30**
     - Average Price: ~**$115** (varies due to randomization)
     - Occupancy Rate: ~**70%**
   - Verify charts display:
     - Revenue over time (monthly bars)
     - Occupancy by day (weekly pattern)
     - Price trends (last 30 days line chart)

5. **Verify Insights Page**
   - Navigate to Insights
   - Check data sections:
     - Weather impact (if weather columns present)
     - Occupancy patterns by day of week
     - Price correlations
   - Click "Generate Analytics"
   - Verify predictions appear (may take 5-10 seconds)
   - If Anthropic API key configured: verify AI insights generate

6. **Generate Pricing**
   - Navigate to Pricing Engine
   - Select property from dropdown
   - Select strategy (Conservative/Balanced/Aggressive)
   - Adjust fine-tuning sliders
   - Click "Generate Pricing"
   - Verify:
     - Recommended price appears
     - Confidence interval shown
     - 14-day forecast table populated
     - Export CSV button works

7. **Database Verification**
   - Open Supabase dashboard
   - Go to Table Editor → `pricing_quotes`
   - Verify latest quote saved:
     - `user_id` matches your test user
     - `property_id` matches uploaded file
     - `recommended_price` is reasonable ($80-$150 range)
     - Timestamps are recent

**Expected Results**:

- ✅ All data displays correctly
- ✅ No fake/mock data visible
- ✅ Analytics predictions reasonable
- ✅ Pricing quote saved to database
- ✅ No console errors

**Common Issues**:

- ❌ "No data available" → Check property selected in dropdown
- ❌ Loading forever → Check backend terminal for errors
- ❌ 401 Unauthorized → Clear localStorage and login again
- ❌ Charts empty → Verify CSV has required columns (date, price, occupied, revenue)

---

### Scenario 2: Insufficient Historical Data

**Goal**: Verify graceful handling of small datasets

**Steps**:

1. Upload `test-insufficient.csv` (5 rows)
2. Navigate to Pricing Engine
3. Generate pricing

**Expected Results**:

- ✅ Warning shown: "Limited historical data - using fallback pricing"
- ✅ Fallback price returned (based on simple average)
- ✅ Application doesn't crash
- ✅ Console shows informative warning

**Pass/Fail**:

- [ ] Warning message displayed
- [ ] Fallback pricing works
- [ ] No crashes or errors

---

### Scenario 3: Missing Weather Columns

**Goal**: Verify graceful degradation when optional data missing

**Steps**:

1. Upload `test-noWeather.csv` (no weather column)
2. Navigate to Insights
3. Check weather-related charts

**Expected Results**:

- ✅ Weather charts show "No weather data available" state
- ✅ Other charts (occupancy, price) still work
- ✅ No errors in console

**Pass/Fail**:

- [ ] Graceful "no data" state shown
- [ ] Other features work normally
- [ ] No JavaScript errors

---

### Scenario 4: Large Dataset Performance

**Goal**: Verify performance on realistic production data

**Steps**:

1. Upload `test-large.csv` (10,000+ rows)
2. Start performance monitoring:
   - Open DevTools → Performance tab
   - Start recording
3. Navigate to Insights
4. Click "Generate Analytics"
5. Stop recording when complete

**Expected Results**:

- ✅ Upload completes in < 5 seconds
- ✅ Analytics processing completes in < 30 seconds
- ✅ Charts render without lag
- ✅ Memory usage stays under 500MB
- ✅ No UI freezing

**Performance Benchmarks**:

- Upload: < 5s for 10k rows
- Analytics: < 30s for statistical analysis
- Chart render: < 2s
- Memory: < 500MB

**Pass/Fail**:

- [ ] Processing time acceptable
- [ ] UI remains responsive
- [ ] Memory usage reasonable

---

## 🐛 Debugging Tips

### Backend Issues

**Check backend logs:**

```bash
cd backend
pnpm run dev
# Watch terminal output for errors
```

**Common backend errors:**

- `ECONNREFUSED` → Supabase credentials incorrect
- `401 Unauthorized` → JWT token expired or invalid
- `500 Internal Server Error` → Check backend terminal for stack trace

### Frontend Issues

**Check browser console:**

- F12 → Console tab
- Look for red errors
- Check Network tab for failed API requests

**Common frontend errors:**

- `Network Error` → Backend not running
- `undefined is not an object` → Missing data in component
- `CORS error` → Backend CORS misconfigured

### Database Issues

**Verify tables exist:**

```bash
cd backend
node test-db.js
```

**Check RLS policies:**

- Open Supabase dashboard
- Go to Authentication → Policies
- Verify all tables have `SELECT`, `INSERT`, `UPDATE` policies
- Verify policies check `auth.uid() = user_id`

---

## ✅ Final Checklist

Before marking Task 8 complete, verify:

**Data Flow**:

- [ ] CSV upload works end-to-end
- [ ] Data displays in Dashboard with correct statistics
- [ ] Insights page shows real data (not mock)
- [ ] Pricing Engine generates quotes from real historical data
- [ ] Database logs all pricing quotes correctly

**No Mock Data**:

- [ ] Dashboard.tsx uses real Supabase data
- [ ] Insights.tsx uses real analytics data
- [ ] PricingEngine.tsx calls real backend API
- [ ] No `insightsData.ts` file present (deleted in Task 1)

**Validation**:

- [ ] Zod validation works (test with invalid request)
- [ ] Proper error messages shown to user
- [ ] 400 errors returned for bad requests

**Performance**:

- [ ] Large datasets (10k+ rows) handle smoothly
- [ ] No memory leaks observed
- [ ] Charts render in < 2 seconds

**Database**:

- [ ] `pricing_quotes` table populated
- [ ] RLS policies enforce user isolation
- [ ] No SQL errors in backend logs

---

## 📊 Test Results Template

Use this template to document your test results:

```markdown
# E2E Test Results - [Date]

**Tester**: [Your name]
**Environment**: Local development
**Backend**: http://localhost:3001
**Frontend**: http://localhost:5173

## Automated Tests

- API Integration Tests: ✅ PASS (7/7)

## Manual Tests

### Scenario 1: Fresh User Journey

- CSV Upload: ✅ PASS
- Dashboard Stats: ✅ PASS
- Insights Page: ✅ PASS
- Pricing Engine: ✅ PASS
- Database Logging: ✅ PASS

### Scenario 2: Insufficient Data

- Warning Shown: ✅ PASS
- Fallback Pricing: ✅ PASS

### Scenario 3: Missing Weather

- Graceful Degradation: ✅ PASS

### Scenario 4: Large Dataset

- Upload Performance: ✅ PASS (3.2s for 10k rows)
- Analytics Performance: ✅ PASS (18s processing)
- Memory Usage: ✅ PASS (285MB peak)

## Issues Found

- None

## Conclusion

✅ All E2E tests passed. Application ready for production use.
```

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Document results** using template above
2. **Commit changes** to version control
3. **Deploy to staging** environment for QA testing
4. **Run tests again** on staging with real Supabase production instance
5. **User acceptance testing** with beta users

**Production deployment checklist**:

- [ ] All E2E tests pass on staging
- [ ] Performance benchmarks met
- [ ] Error monitoring configured (Sentry, LogRocket)
- [ ] Database backups scheduled
- [ ] SSL certificates configured
- [ ] Environment variables secured

---

**Questions?** Check `docs/developer/ARCHITECTURE.md` for technical details or `CLAUDE.md` for development patterns.
