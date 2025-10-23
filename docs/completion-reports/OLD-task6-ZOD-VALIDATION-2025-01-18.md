# Task 6: Implement Zod Input Validation

**Priority**: LOW-MEDIUM
**Status**: NOT STARTED
**Effort**: 2-4 hours
**Blocker**: None (independent task)
**Assigned**: Future sprint

---

## 🎯 Objective

Add runtime type validation to all API endpoints using Zod for better error messages and security.

---

## 📋 Implementation Steps

### Step 1: Install Zod

```bash
pnpm add zod
```

### Step 2: Create Validation Schemas

**File**: `backend/schemas/pricing.schema.ts`

```typescript
import { z } from 'zod'

export const pricingQuoteSchema = z.object({
  property_id: z.string().uuid(),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  strategy: z.enum(['conservative', 'balanced', 'aggressive']),
  demand_sensitivity: z.number().min(0).max(100).optional(),
  price_aggression: z.number().min(0).max(100).optional(),
  occupancy_target: z.number().min(0).max(100).optional(),
})

export type PricingQuoteRequest = z.infer<typeof pricingQuoteSchema>
```

### Step 3: Create Validation Middleware

**File**: `backend/middleware/validate.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.errors.map(e => e.message).join(', '),
      })
    }
  }
}
```

### Step 4: Apply to Routes

**File**: `backend/routes/pricing.ts`

```typescript
import { validate } from '../middleware/validate.js'
import { pricingQuoteSchema } from '../schemas/pricing.schema.js'

router.post(
  '/quote',
  authenticateUser,
  validate(pricingQuoteSchema), // Add validation
  async (req, res) => {
    // req.body is now validated and typed!
  }
)
```

### Step 5: Create Schemas for All Endpoints

Files to create:

- `backend/schemas/analytics.schema.ts`
- `backend/schemas/data.schema.ts`
- `backend/schemas/enrichment.schema.ts`

---

## ✅ Acceptance Criteria

- [ ] All endpoints have Zod schemas
- [ ] Validation errors return 400 with clear messages
- [ ] TypeScript types inferred from schemas
- [ ] No breaking changes to existing clients

---

**Reference**: `docs/COMPREHENSIVE-AUDIT-2025-01-18.md` (High Priority #2)
**Next Task**: Task 7 (Shared types package)
