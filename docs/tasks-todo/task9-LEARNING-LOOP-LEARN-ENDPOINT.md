# Task9 — Close the Learning Loop (`/learn`) & Weekly Retraining

## Why (Urgency)

Self-learning from booking outcomes is the defensible moat.

## Scope

- Implement `/learn` ingestion
- Persist outcomes dataset per property
- CI/CD retraining job + drift detection

## Steps

1. **Ingestion**
   - Accept batch of outcomes: quoted_price, accepted, time_to_book, final_price, comp bands, context snapshot.
   - Validate and append to dataset tables.
2. **Retraining**
   - Weekly GH Action builds training image, retrains, stores new model + metrics, updates registry.
3. **Drift**
   - KS test for feature drift vs previous month; trigger early retrain if drifted.
4. **Dashboard**
   - Show latest model version, metrics trend, and data freshness.

## Acceptance Criteria

- New bookings appear in dataset; weekly retrain increments version.
- Drift detector logs when thresholds breached.

## Deliverables

- `/learn` FastAPI, retraining workflow, dashboard cards.

## Risks

- Skew between quoted and realized prices; document handling.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
