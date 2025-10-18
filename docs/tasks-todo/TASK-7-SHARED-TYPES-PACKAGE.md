# Task 7: Create Shared Types Package

**Priority**: LOW (Nice to have)
**Status**: NOT STARTED
**Effort**: 3-5 hours
**Blocker**: None (independent task)
**Assigned**: Optional / Future

---

## 🎯 Objective

Prevent frontend/backend type drift by creating a shared types package that both can import.

---

## 📋 Implementation Steps

### Step 1: Create Shared Package

```bash
mkdir shared
cd shared
pnpm init
```

**File**: `shared/package.json`

```json
{
  "name": "@jengu/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Step 2: Create Type Definitions

**File**: `shared/src/types/pricing.ts`

```typescript
export interface PricingQuoteRequest {
  property_id: string
  check_in_date: string
  strategy: 'conservative' | 'balanced' | 'aggressive'
  demand_sensitivity?: number
  price_aggression?: number
  occupancy_target?: number
}

export interface PricingQuoteResponse {
  price: number
  confidence_interval: [number, number]
  expected: {
    revenue: number
    occupancy_now: number
    occupancy_end_bucket: number
  }
  reasons: {
    baseline: number
    market_shift: number
    occupancy_gap: number
    risk_clamp: number
    event_uplift: number
  }
}
```

### Step 3: Build Package

```bash
cd shared
pnpm build
```

### Step 4: Link to Frontend & Backend

**File**: `pnpm-workspace.yaml`

```yaml
packages:
  - 'backend'
  - 'frontend'
  - 'shared'
```

**Import in backend**:
```typescript
import { PricingQuoteRequest } from '@jengu/shared'
```

**Import in frontend**:
```typescript
import { PricingQuoteRequest } from '@jengu/shared'
```

---

## ✅ Acceptance Criteria

- [ ] Shared package builds successfully
- [ ] Types imported in both frontend and backend
- [ ] No duplicate type definitions
- [ ] Auto-rebuilds on changes in watch mode

---

**Reference**: `docs/COMPREHENSIVE-AUDIT-2025-01-18.md` (High Priority #3)
**Next Task**: Task 8 (E2E testing)
