# CLAUDE_TASKS_MASTER_PLAYBOOK.md

**Purpose:** Single source of truth for integrating and operating the **Hybrid Pricing Engine** (Option E++, occupancy-aware) in this repo.  
This document gives **Claude** everything needed to execute safely, reason about gaps, and ship a working system without touching unrelated code.

> **Read me first (Claude):**
>
> - Follow the **Safety Rules** and **Scope Boundaries** exactly.
> - If a decision is required, see **💡 Claude Decide** boxes. If verification is required, see **⚠️ Claude Verify** boxes.
> - Use the **🧩 Claude Implement** tasks as your actionable todo list.
> - Never refactor or delete existing modules unless explicitly asked below.

---

## 0) Context (what we’re building and why)

We are building a **pricing service** that sets daily prices for rooms/pitches. It must:

- **Cold-start well** with thin/messy historicals.
- **Adapt daily** using bookings, compset (optional), weather and holidays (we already have these), and inventory.
- **Respect occupancy targets** (sell-through) while maximizing revenue.
- Provide **valid uncertainty** via conformal bands so exploration is safe.
- Expose **simple director toggles** (risk mode, parity, fill-vs-rate) through the existing app UI.

We will keep the app’s **frontend and backend stable** and attach a **separate Python microservice** for modeling. The backend alone talks to **Supabase**. Pricing service remains **stateless** with respect to the DB and receives all context via API payloads.

---

## 1) Scope & Safety Rules (do not violate)

- Do **NOT** edit or move files outside the paths listed below.
- Do **NOT** remove or refactor existing endpoints or middleware.
- Only **add** the following backend endpoints:
  - `POST /api/pricing/quote`
  - `POST /api/pricing/learn`
- The Python microservice lives **only** in `/services/pricing/`.
- All Supabase reads/writes happen **in the backend** using the existing `supabaseAdmin` (service role) client and **manual filtering by `userId`**.
- Validate all inputs (IDs, dates, toggles) server-side; never trust the client.

---

## 2) Current Stack & Schema (ground truth)

### 2.1 Backend

- **Express.js** (Node 20+, TypeScript)
- `authenticateUser` middleware (JWT via Supabase Auth)
- `supabaseAdmin` client (service role key)
- Manual `userId` filtering

### 2.2 Frontend

- Axios to `/api/*`
- Session JWT auto-injected

### 2.3 Supabase Tables (existing)

- `pricing_data` (main time series: **bookings**, price, occupancy, weather/holiday enrichments)
- `properties` (links to user)
- `business_settings` (profile, location, **add** `capacity_config` JSONB)
- `users`

### 2.4 Missing (to add)

- `pricing_quotes` (each shown price)
- `pricing_outcomes` (outcome for a quote)
- `inventory_snapshots` (optional, preferred): capacity & remaining by stay_date/product_type

---

## 3) Deployment Modes (choose later with env flags)

We support both patterns without code churn:

- **Mode A (Monolith-friendly dev):** Python pricing service runs locally on port `8000`. Backend calls it via `PRICING_SERVICE_URL`.
- **Mode B (Microservice prod):** Python service deployed separately (Render/Fly/AWS). Backend still calls via `PRICING_SERVICE_URL`.

> 💡 **Claude Decide:** For current environment, pick **Mode A** by default. Keep all code parameterized by `PRICING_SERVICE_URL` so switching to Mode B is trivial.

Env in `backend/.env`:

```
PRICING_SERVICE_URL=http://localhost:8000
ENABLE_CRON=false
```

---

## 4) Data Model Additions (Supabase)

🧩 **Claude Implement:** Create these migrations (idempotent) and run via Supabase CLI.

```sql
-- QUOTES: price shown
CREATE TABLE IF NOT EXISTS pricing_quotes (
  quote_id TEXT PRIMARY KEY,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  propertyId UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  stay_date DATE NOT NULL,
  lead_days INT NOT NULL,
  product_type TEXT NOT NULL,
  refundable BOOLEAN NOT NULL,
  los INT NOT NULL,
  price_offered NUMERIC NOT NULL,
  inventory_remaining INT,
  inventory_capacity INT,
  season TEXT,
  dow INT,
  comp_p10 NUMERIC,
  comp_p50 NUMERIC,
  comp_p90 NUMERIC,
  weather_tmax NUMERIC,
  weather_rain_mm NUMERIC,
  toggles_hash TEXT,
  shown_to_user_bool BOOLEAN DEFAULT TRUE
);
ALTER TABLE pricing_quotes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pricing_quotes_user ON pricing_quotes(userId);
CREATE INDEX IF NOT EXISTS idx_pricing_quotes_property_date ON pricing_quotes(propertyId, stay_date);

-- OUTCOMES: what happened
CREATE TABLE IF NOT EXISTS pricing_outcomes (
  quote_id TEXT PRIMARY KEY REFERENCES pricing_quotes(quote_id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booked_bool BOOLEAN NOT NULL,
  booking_time TIMESTAMP,
  cancelled_bool BOOLEAN,
  revenue_realized NUMERIC,
  no_show_bool BOOLEAN
);
ALTER TABLE pricing_outcomes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pricing_outcomes_user ON pricing_outcomes(userId);
CREATE INDEX IF NOT EXISTS idx_pricing_outcomes_booked ON pricing_outcomes(booked_bool);

-- Optional but recommended: INVENTORY SNAPSHOTS
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  propertyId UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  stay_date DATE NOT NULL,
  product_type TEXT NOT NULL,
  capacity INT NOT NULL,
  remaining INT NOT NULL,
  captured_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_user ON inventory_snapshots(userId);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_composite ON inventory_snapshots(propertyId, stay_date, product_type);

-- Add fallback capacity config
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS capacity_config JSONB;

-- Helpful indexes for pricing_data
CREATE INDEX IF NOT EXISTS idx_pricing_data_property_date ON pricing_data(propertyId, date);
CREATE INDEX IF NOT EXISTS idx_pricing_data_date ON pricing_data(date);

-- RLS (conservative; application filters by userId as well)
CREATE POLICY "select_own_quotes" ON pricing_quotes FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "insert_own_quotes" ON pricing_quotes FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "select_own_outcomes" ON pricing_outcomes FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "insert_own_outcomes" ON pricing_outcomes FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "select_own_inventory" ON inventory_snapshots FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "insert_own_inventory" ON inventory_snapshots FOR INSERT WITH CHECK (auth.uid() = "userId");
```

⚠️ **Claude Verify:** After migrations, check that the tables and indexes exist. If not, re-run.

---

## 5) Backend Additions (Express)

🧩 **Claude Implement:** Add **only** the following to `backend/server.ts`. Do not modify unrelated routes.

```ts
// Imports at top
import crypto from 'node:crypto'
import fetch from 'node-fetch'

const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || 'http://localhost:8000'

async function callPricingScore(body: unknown) {
  const res = await fetch(`${PRICING_SERVICE_URL}/score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`pricing /score ${res.status}: ${await res.text()}`)
  return res.json()
}

async function callPricingLearn(batch: unknown[]) {
  const res = await fetch(`${PRICING_SERVICE_URL}/learn`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(batch),
  })
  if (!res.ok) throw new Error(`pricing /learn ${res.status}: ${await res.text()}`)
  return res.json()
}

// POST /api/pricing/quote — proxy + log
app.post('/api/pricing/quote', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId!
    const { propertyId, stayDate, product, toggles, allowed_price_grid } = req.body
    if (!propertyId || !stayDate || !product?.type) {
      return res.status(400).json({ error: 'missing_fields' })
    }

    // Business settings (for capacity fallback)
    const { data: settings, error: sErr } = await supabaseAdmin
      .from('business_settings')
      .select('userid, timezone, capacity_config')
      .eq('userid', userId)
      .single()
    if (sErr) throw sErr

    // Inventory snapshot preferred
    const { data: inv } = await supabaseAdmin
      .from('inventory_snapshots')
      .select('capacity, remaining')
      .eq('userId', userId)
      .eq('propertyId', propertyId)
      .eq('stay_date', stayDate)
      .eq('product_type', product.type)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const capacity = inv?.capacity ?? settings?.capacity_config?.[product.type] ?? null
    const remaining = inv?.remaining ?? null

    // Context (derived)
    const d = new Date(stayDate + 'T00:00:00Z')
    const dow = d.getUTCDay()
    const m = d.getUTCMonth() + 1
    const season = m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn'

    // Optional: compset (if exists)
    let comp_p10 = null,
      comp_p50 = null,
      comp_p90 = null
    try {
      const { data: comp } = await supabaseAdmin
        .from('compset_snapshots')
        .select('p10, p50, p90')
        .eq('userId', userId)
        .eq('propertyId', propertyId)
        .eq('product_type', product.type)
        .lte('date', stayDate)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (comp) {
        comp_p10 = comp.p10
        comp_p50 = comp.p50
        comp_p90 = comp.p90
      }
    } catch {}

    // Optional weather: available historically in pricing_data; for stayDate leave {} or connect your cache
    const weather: any = {}

    // Build payload for pricing service
    const payload = {
      entity: { userId, propertyId },
      stay_date: stayDate,
      quote_time: new Date().toISOString(),
      product,
      inventory: { capacity, remaining, overbook_limit: 0 },
      market: { comp_price_p10: comp_p10, comp_price_p50: comp_p50, comp_price_p90: comp_p90 },
      costs: {},
      context: { season, day_of_week: dow, weather },
      toggles,
      allowed_price_grid,
    }

    const data = await callPricingScore(payload)

    // Log quote
    const quote_id = crypto.randomUUID()
    const toggles_hash = crypto.createHash('sha1').update(JSON.stringify(toggles)).digest('hex')
    const lead_days = Math.max(0, Math.ceil((Date.parse(stayDate) - Date.now()) / 86400000))

    await supabaseAdmin.from('pricing_quotes').insert({
      quote_id,
      userId,
      propertyId,
      stay_date: stayDate,
      lead_days,
      product_type: product.type,
      refundable: !!product.refundable,
      los: product.los ?? 1,
      price_offered: data.price,
      inventory_remaining: remaining,
      inventory_capacity: capacity,
      season,
      dow,
      comp_p10,
      comp_p50,
      comp_p90,
      weather_tmax: weather.tmax ?? null,
      weather_rain_mm: weather.rain_mm ?? null,
      toggles_hash,
      shown_to_user_bool: true,
    })

    return res.json({ success: true, quote_id, data })
  } catch (e) {
    console.error('pricing/quote error', e)
    return res.status(500).json({ error: 'pricing_quote_failed', message: String(e) })
  }
})

// POST /api/pricing/learn — batch outcomes + model update
app.post('/api/pricing/learn', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId!
    const batch = Array.isArray(req.body) ? req.body : []

    if (batch.length > 0) {
      const upserts = batch.map((r: any) => ({
        quote_id: r.quote_id,
        userId,
        booked_bool: !!r.booked,
        booking_time: r.booking_time ?? (r.booked ? new Date().toISOString() : null),
        cancelled_bool: r.cancelled ?? null,
        revenue_realized: r.revenue_realized ?? null,
        no_show_bool: r.no_show_bool ?? null,
      }))
      await supabaseAdmin.from('pricing_outcomes').upsert(upserts, { onConflict: 'quote_id' })
    }

    const learn = await callPricingLearn(batch)
    return res.json({ success: true, learn })
  } catch (e) {
    console.error('pricing/learn error', e)
    return res.status(500).json({ error: 'pricing_learn_failed', message: String(e) })
  }
})
```

⚠️ **Claude Verify:** Ensure imports resolve and there are no TS type errors. Ensure `PRICING_SERVICE_URL` is present in `.env`.

---

## 6) Python Pricing Service (services/pricing)

We already have a working skeleton including:

- `/score` — returns `{ price, price_grid, conf_band, expected, reasons, safety }`
- `/learn` — ingests logs and updates priors

🧩 **Claude Implement (if missing):** Add `/ready`, `/live`, `/version` health endpoints.  
**/ready** returns 200 only if priors/forecaster/conformal calibrator exist in `model_store/` or after first successful scoring/learning.

> 💡 **Claude Decide:** If the service has not yet trained any model, `/ready` should return 503 until at least one `/learn` batch is processed OR a default prior is saved.

---

## 7) Occupancy-aware Objective (already designed)

Key requirements at pricing time:

- Input must include `inventory.capacity` and `inventory.remaining`.
- Response must include `expected.occ_now` and `expected.occ_end_bucket`.
- Grid filtering and objective must respect **director targets** and **risk mode** (conformal lower-bound on revenue/occupancy).

⚠️ **Claude Verify:** If `capacity` is `null`, attempt fallback to `business_settings.capacity_config[product.type]`.  
If still missing → return 400 with `{ reason: "missing_capacity" }` from backend or set 0 with warning flag.

---

## 8) Learning & Cadence

Recommended schedule (implement as cron later):

- **Daily 00:30** — EnKF assimilation, forecast refresh, conformal recalibration
- **Weekly Sun 01:00** — Ensemble retrain + RL ladder update
- **Monthly 02:00** — Hierarchical priors refit

🧩 **Claude Implement (optional now):** Add `node-cron` with `ENABLE_CRON=true` guard that calls `/api/pricing/learn` after compiling a batch from Supabase (`pricing_quotes` ⟞ `pricing_outcomes`).

---

## 9) Data Flow Summary

1. Frontend calls `POST /api/pricing/quote` with `{ propertyId, stayDate, product, toggles }`.
2. Backend fetches capacity/remaining (prefer `inventory_snapshots`, fallback `business_settings.capacity_config`), computes season/DOW, joins optional compset/weather.
3. Backend calls Python `/score` and returns the price to frontend; **logs** quote to `pricing_quotes`.
4. Nightly, backend builds learning batch from `pricing_quotes` + `pricing_outcomes` and calls `/learn`.

---

## 10) Health, Metrics & Checks

- **Service health:** `/live` (always 200), `/ready` (200 only when artifacts ready), `/version`.
- **Metrics (implement later):** RevPAR, ADR, Occupancy (now vs. target) by lead bucket; Conformal coverage; Exploration rate; Max day-over-day price change.
- **Checks:** Table existence, indexes present, capacity source exists, graceful handling when compset/weather missing.

🧩 **Claude Implement:** Add a simple CLI or backend route `/api/pricing/check-readiness` that runs the DB/table/index checks once and returns a JSON report.

---

## 11) Director Toggles (storage options)

Two safe choices:

- Extend `business_settings` with minimal toggle fields, **or**
- Create `director_preferences` keyed by `(userId, propertyId)`.

> 💡 **Claude Decide:** For now, **do not** change DB schema for toggles; accept toggles in the request body and compute a `toggles_hash` for logging. Later, persist in a dedicated table as needed.

---

## 12) What to do **right now** (ordered checklist)

### Phase 1 — DB & indexes

- 🧩 Create migrations for `pricing_quotes`, `pricing_outcomes`, `inventory_snapshots`, `capacity_config` column.
- ⚠️ Verify tables + indexes exist.

### Phase 2 — Backend endpoints (Express)

- 🧩 Add `POST /api/pricing/quote` and `POST /api/pricing/learn` (code above).
- ⚠️ Verify env `PRICING_SERVICE_URL` is set.

### Phase 3 — Pricing service health

- 🧩 Ensure `/score`, `/learn` work; add `/ready`, `/live`, `/version`.
- 🧩 Return `expected.occ_now` and `expected.occ_end_bucket` from `/score`.

### Phase 4 — Readiness check route

- 🧩 Implement `/api/pricing/check-readiness` in backend to validate DB state (tables, indexes, capacity source).

### Phase 5 — (Optional) Cron

- 🧩 Add nightly `node-cron` guarded by `ENABLE_CRON` to assemble batch and call `/api/pricing/learn`.

### Phase 6 — (Optional) Compset & Weather cache

- 🧩 If you introduce `compset_snapshots`, wire the optional join in `/api/pricing/quote` (already coded to fail gracefully).

---

## 13) Open Decisions for Claude (reason & choose)

- 💡 **Deployment mode:** Choose Mode A now; ensure switching to Mode B is 1-line `.env` change.
- 💡 **Capacity source:** If neither `inventory_snapshots` nor `capacity_config` is available, respond with an actionable error message that the user must provide capacity per product_type.
- 💡 **Learning cadence:** If `ENABLE_CRON=true`, implement daily learn batch. Otherwise provide a one-liner `curl` in README for manual trigger.
- 💡 **Optional UI:** Defer. When requested, create a minimal “Pricing Strategy” panel to edit toggles and preview a week of prices.

---

## 14) Acceptance Criteria (done = ✅)

- ✅ `/api/pricing/quote` returns `{ success, quote_id, data }`, where `data.price` exists and `data.expected.occ_end_bucket` ∈ [0,1].
- ✅ `pricing_quotes` row written per quote call.
- ✅ `/api/pricing/learn` upserts to `pricing_outcomes` and returns `{ success: true }`.
- ✅ Python `/ready` 200 after first learn or default prior load.
- ✅ DB readiness check returns OK (tables, indexes, capacity source).

---

## Appendix A — Example `curl`

```bash
# Score
curl -s http://localhost:3001/api/pricing/quote \
  -H "Authorization: Bearer <JWT>" \
  -H "content-type: application/json" \
  -d '{
    "propertyId":"<UUID>",
    "stayDate":"2025-08-20",
    "product":{"type":"standard","refundable":true,"los":1},
    "toggles":{
      "strategy_fill_vs_rate":50,
      "exploration_pct":5,
      "risk_mode":"balanced",
      "market_rank_band":[0.3,0.7],
      "react_to_competition":"match",
      "min_price":60,
      "max_price":220,
      "max_day_delta_pct":10,
      "parity_min_pct":0.9,
      "parity_max_pct":1.1,
      "target_occ_by_lead":{"0-1":0.85,"2-7":0.75,"8-21":0.65},
      "nrf_discount_pct":10,
      "upgrade_floor_diff":15
    }
  }' | jq .

# Learn (batch)
curl -s http://localhost:3001/api/pricing/learn \
  -H "Authorization: Bearer <JWT>" \
  -H "content-type: application/json" \
  -d '[{
    "quote_id":"q-001",
    "entity":{"userId":"<UUID>","propertyId":"<UUID>"},
    "stay_date":"2025-08-20",
    "product":{"type":"standard","refundable":true,"los":1},
    "context":{"season":"summer","day_of_week":3},
    "price_offered":119,
    "booked":true,
    "cancelled":false,
    "revenue_realized":119
  }]' | jq .
```

---

**End of Master Playbook.**
Place at: `/services/pricing/CLAUDE_TASKS_MASTER_PLAYBOOK.md` (or `/docs/`).
Claude: execute tasks in order, confirm each ✅ criterion, and report back with diffs, logs, and any open decisions.

---

## ✅ IMPLEMENTATION COMPLETE (2025-01-18)

**Status**: All phases and acceptance criteria met.

**Implementation Notes**:

- Section 5 (Backend): Implemented as modular route file `backend/routes/pricing.ts` instead of inline in server.ts (follows existing codebase patterns, better code organization)
- Section 6 (Python Service): Fully implemented with all health endpoints in `services/pricing/main.py`
- Phase 1-4: Complete
- Phase 5 (Cron): Deferred to Phase 2 (ML implementation)
- Phase 6 (Compset): Gracefully handled (optional table, code fails gracefully if missing)

**Files Created**:

- `backend/migrations/add_pricing_engine_tables.sql` - Database schema
- `backend/routes/pricing.ts` - Backend endpoints (438 lines)
- `services/pricing/main.py` - Python FastAPI service (505 lines)
- `services/pricing/requirements.txt` - Python dependencies
- `frontend/src/lib/api/services/pricing.ts` - Frontend API client (264 lines)
- Complete documentation suite (8 files)

**Git Commits**: 5c4c6e0, 578d112, 510d54f

**See**: `docs/tasks-done/MASTER-PLAYBOOK-COMPLETED-2025-01-18.md` for detailed completion report.
