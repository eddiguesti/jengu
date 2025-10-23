# Task14 — Pricing Simulation Sandbox (“What-if”)

## Why (Urgency)

Build trust in automation; let users preview impact before applying.

## Scope

- `/api/pricing/simulate` endpoint
- UI panel on PricingPage
- CI bands & RevPAR deltas

## Steps

1. **API**
   - Accept base context and a grid of adjustments (±5/10/15%, LOS changes, refundable toggle).
   - Return variant prices, expected occupancy delta, and CI.
2. **UI**
   - Visualize 5-point grid; select to apply price to quote.
3. **Validation**
   - Ensure bounds enforcement and safe defaults.

## Acceptance Criteria

- For any date, returns 5 coherent variants with reasons.
- Users can apply selected variant to booking flow.

## Deliverables

- Endpoint, UI, and tests.

## Risks

- Misinterpretation of projections; add tooltips and caveats.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
