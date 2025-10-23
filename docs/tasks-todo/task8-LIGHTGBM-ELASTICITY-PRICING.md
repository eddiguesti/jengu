# Task8 — LightGBM Elasticity Model for Pricing

## Why (Urgency)

Move beyond rule-based multipliers to data-driven elasticity for revenue lift.

## Scope

- Train LightGBM per property (or clustered)
- Feature engineering from enriched data + comps
- Metrics endpoint

## Steps

1. **Dataset**
   - Build training frame: features (season, DOW, lead time, weather, comps, occupancy, LOS, refundable) and target (conversion/ADR/RevPAR proxy).
2. **Model**
   - Train LightGBM; persist `models/<propertyId>.bin` and metadata table (version, metrics, features_hash).
3. **Serving**
   - Add `use_ml` path in `/score` to price based on predicted demand elasticity with guardrails (min/max, event overrides).
4. **Metrics**
   - `/metrics` returns MAE/RMSE, feature importances.
5. **A/B**
   - Feature flag to compare ML vs rule-based in backtests.

## Acceptance Criteria

- Backtest shows uplift vs baseline on historical replay.
- Models load on service start; checksum logged.

## Deliverables

- Training script, model registry, metrics endpoint.

## Risks

- Data sparsity → backoff to cluster-level model + Bayesian priors.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
