# Task Priority List - January 2025

**Date Created**: 2025-01-18
**Status**: Current work plan based on completed work analysis

---

## ✅ Already Completed (Do NOT Redo)

Based on `docs/tasks-done/` analysis:

- ✅ **Task 4**: Linting errors fixed
- ✅ **Task 5**: Architectural review completed
- ✅ **Pricing Engine Phase 1 (MVP)**: Fully implemented
  - Database migrations done
  - Python FastAPI service created
  - Backend `/api/pricing/*` endpoints working
  - Frontend API client created
  - Complete documentation
- ✅ **Master Playbook**: Completed and documented
- ✅ **Prediction Models**: Verified and documented (today)

---

## 🎯 Tasks in Priority Order (First to Last)

### **Task 1: Remove All Fake/Mock Data from Frontend** ⚡ CRITICAL

**Status**: IN PROGRESS
**Priority**: HIGHEST (User specifically requested this)
**Effort**: 2-3 hours
**Blocker**: None

**Why First**: User explicitly said "make sure you get rid of all fake data as i want to make sure it works correctly"

**Files to Fix**:
1. ✅ `frontend/src/pages/Dashboard.tsx` - DONE (replaced with real Supabase data)
2. ❌ `frontend/src/pages/Insights.tsx` - Uses `getCombinedInsights()` mock data
3. ❌ `frontend/src/lib/services/insightsData.ts` - Mock data generator (can be deleted)
4. ❌ Remove hardcoded statistics text in Insights.tsx (lines 428-490)
5. ❌ Verify all charts show "No data" state when data is empty

**Acceptance Criteria**:
- All charts use real data from Supabase via React Query hooks
- No hardcoded/fake data anywhere in UI
- Empty states show when no data uploaded
- All predictions come from ML analytics backend

---

### **Task 2: Wire Frontend PricingEngine.tsx to Real Backend APIs**

**Status**: NOT STARTED
**Priority**: HIGH
**Effort**: 2-3 hours
**Blocker**: Task 1 must complete first

**Why Second**: Pricing Engine backend is ready but frontend still uses mock data

**Context**:
- Backend `/api/pricing/quote` exists and works
- Python service `services/pricing/main.py` operational
- Frontend `PricingEngine.tsx` (1,090 lines) uses client-side simulation

**What to Do**:
1. Replace `generateSimulatedRecommendations()` with real API calls
2. Use `frontend/src/lib/api/services/pricing.ts` client (already created)
3. Update state management to handle async API responses
4. Add loading states and error handling
5. Test with real property data

**Files to Modify**:
- `frontend/src/pages/PricingEngine.tsx`

**Reference**:
- `docs/tasks-done/PRICING-ENGINE-PHASE-1-COMPLETED-2025-01-18.md`
- `docs/developer/PRICING_ENGINE_SETUP.md`

---

### **Task 3: Implement Premium Charts (ECharts + AntV)**

**Status**: NOT STARTED
**Priority**: MEDIUM-HIGH
**Effort**: 8-12 hours
**Blocker**: Task 1 (data must be real first)

**Why Third**: Enhances existing functionality, builds on real data foundation

**Source**: `docs/tasks-todo/CLAUDE_UI_CHARTS_IMPLEMENTATION.md`

**What to Build**:

#### Phase 3A: Setup (1 hour)
```bash
pnpm add echarts echarts-for-react @ant-design/plots
```

Create structure:
```
frontend/src/features/pricingDashboard/
├─ state/useDashboardStore.ts
├─ api/analyticsClient.ts
├─ components/
│  ├─ tiles/KpiTiles.tsx
│  └─ charts/
│     ├─ LineWithBand.tsx
│     ├─ IndexedLines.tsx
│     ├─ HeatmapRevLead.tsx
│     ├─ ElasticityCurve.tsx
│     └─ WaterfallPrice.tsx
└─ DashboardShell.tsx
```

#### Phase 3B: Charts to Implement (6-8 hours)
1. **Revenue vs Optimized (Gain)** - ECharts line with shaded area
2. **Occupancy Pace vs Target** - Lead bucket visualization
3. **ADR vs Competitor Index** - Indexed lines with bands
4. **Lead × Season Revenue Heatmap** - ECharts heatmap
5. **Forecast vs Actual Bookings** - Line chart with confidence band
6. **Interactive Elasticity Curve** - Draggable price marker
7. **Price Adjustment Waterfall** - AntV waterfall ("Why this price")

#### Phase 3C: Backend Analytics Endpoints (3-4 hours)
Add to `backend/routes/analytics.ts`:
- `POST /api/analytics/revenue-series`
- `POST /api/analytics/occupancy-pace`
- `POST /api/analytics/adr-index`
- `POST /api/analytics/rev-lead-heatmap`
- `POST /api/analytics/forecast-actual`
- `POST /api/analytics/elasticity`
- `POST /api/analytics/price-explain`

**Files to Create**: ~12 new files (components + endpoints)

**Reference**: `docs/tasks-todo/CLAUDE_UI_CHARTS_IMPLEMENTATION.md`

---

### **Task 4: Connect Pricing Engine Charts to Real Endpoints**

**Status**: NOT STARTED
**Priority**: MEDIUM
**Effort**: 2-3 hours
**Blocker**: Task 3 (charts must exist)

**Why Fourth**: Brings premium charts online with actual pricing data

**What to Do**:
1. Modify `DashboardShell.tsx` to call pricing service `/score` endpoint
2. Extract price grid, expected revenue, and reasoning from response
3. Populate **Elasticity Curve** and **Waterfall** charts
4. Add feature flag `PRICING_DASH_V2=true` in `.env`
5. Test with different pricing strategies

**Files to Modify**:
- `frontend/src/features/pricingDashboard/DashboardShell.tsx`
- `frontend/src/features/pricingDashboard/api/analyticsClient.ts`
- `frontend/src/pages/PricingEngine.tsx` (add feature flag toggle)

---

### **Task 5: Add Pre-commit Hooks for Code Quality**

**Status**: NOT STARTED
**Priority**: LOW-MEDIUM
**Effort**: 30 minutes
**Blocker**: None (independent task)

**Why Fifth**: Prevents future code quality issues

**What to Do**:
```bash
pnpm add -D husky lint-staged

# Add to package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

**Files to Create**:
- `.husky/pre-commit`

**Files to Modify**:
- `package.json` (add lint-staged config)

**Reference**: `docs/COMPREHENSIVE-AUDIT-2025-01-18.md` (High Priority Improvement #1)

---

### **Task 6: Implement Zod Input Validation**

**Status**: NOT STARTED
**Priority**: LOW-MEDIUM
**Effort**: 2-4 hours
**Blocker**: None (independent task)

**Why Sixth**: Runtime type safety for API endpoints

**What to Do**:
```bash
pnpm add zod
```

1. Create validation schemas for all API endpoints
2. Replace manual validation in `backend/routes/*.ts`
3. Add error response formatting
4. Test with invalid inputs

**Files to Create**:
- `backend/schemas/analytics.schema.ts`
- `backend/schemas/pricing.schema.ts`
- `backend/schemas/data.schema.ts`

**Files to Modify**:
- All route files in `backend/routes/`

**Reference**: `docs/COMPREHENSIVE-AUDIT-2025-01-18.md` (High Priority Improvement #2)

---

### **Task 7: Create Shared Types Package**

**Status**: NOT STARTED
**Priority**: LOW
**Effort**: 3-5 hours
**Blocker**: None (nice-to-have)

**Why Seventh**: Prevents frontend/backend type drift

**What to Do**:
```bash
mkdir shared
cd shared
pnpm init
```

1. Extract common types to `shared/src/types/`
2. Build TypeScript package
3. Import in both frontend and backend
4. Update imports across codebase

**Files to Create**:
- `shared/package.json`
- `shared/tsconfig.json`
- `shared/src/types/pricing.ts`
- `shared/src/types/analytics.ts`

**Files to Modify**:
- `pnpm-workspace.yaml` (add shared package)
- Multiple files (update imports)

**Reference**: `docs/COMPREHENSIVE-AUDIT-2025-01-18.md` (High Priority Improvement #3)

---

### **Task 8: End-to-End Testing with Real Data**

**Status**: NOT STARTED
**Priority**: LOW (Validation task)
**Effort**: 1-2 hours
**Blocker**: Tasks 1-4 must complete

**Why Last**: Validates all previous work

**What to Test**:
1. Upload real CSV with historical booking data
2. Verify Dashboard shows correct statistics
3. Generate analytics predictions
4. Request pricing quote via PricingEngine
5. View premium charts with real data
6. Export results to CSV
7. Verify database logging

**Test Data**: Use real anonymized booking data (30+ days recommended)

---

## 📊 Summary Matrix

| Task | Priority | Effort | Blocker | Status |
|------|----------|--------|---------|--------|
| 1. Remove Fake Data | HIGHEST ⚡ | 2-3h | None | IN PROGRESS |
| 2. Wire PricingEngine | HIGH | 2-3h | Task 1 | NOT STARTED |
| 3. Premium Charts | MEDIUM-HIGH | 8-12h | Task 1 | NOT STARTED |
| 4. Connect Charts to Pricing | MEDIUM | 2-3h | Task 3 | NOT STARTED |
| 5. Pre-commit Hooks | LOW-MEDIUM | 30m | None | NOT STARTED |
| 6. Zod Validation | LOW-MEDIUM | 2-4h | None | NOT STARTED |
| 7. Shared Types | LOW | 3-5h | None | NOT STARTED |
| 8. E2E Testing | LOW | 1-2h | Tasks 1-4 | NOT STARTED |

**Total Estimated Effort**: 21-32 hours

---

## 🚀 Recommended Execution Plan

### Week 1 (Critical Path)
- **Day 1**: Complete Task 1 (Remove Fake Data)
- **Day 2**: Complete Task 2 (Wire PricingEngine)
- **Day 3-4**: Complete Task 3 (Premium Charts)
- **Day 5**: Complete Task 4 (Connect Charts)

### Week 2 (Quality Improvements)
- **Day 1**: Complete Task 5 (Pre-commit Hooks)
- **Day 2-3**: Complete Task 6 (Zod Validation)
- **Day 4**: Complete Task 8 (E2E Testing)

### Optional (Future)
- Task 7 (Shared Types) - Nice to have, not critical

---

## 💡 Notes

### What NOT to Do
- ❌ Do NOT reimplement Pricing Engine (already done)
- ❌ Do NOT redo database migrations (already applied)
- ❌ Do NOT recreate Python service (exists in `services/pricing/`)
- ❌ Do NOT touch prediction models (verified working today)

### Safe to Modify
- ✅ Frontend UI components (Dashboard, Insights, PricingEngine)
- ✅ Backend route handlers (add new endpoints)
- ✅ Frontend API clients (wire to backend)
- ✅ Chart components (create new ones)

### Current Working State
- Backend server: Running on port 3001
- Python pricing service: Available at `http://localhost:8000`
- Frontend: Running on port 5173
- Database: Supabase with all tables created
- Prediction models: Fully operational and verified

---

**Last Updated**: 2025-01-18
**Next Review**: After Task 1 completion
