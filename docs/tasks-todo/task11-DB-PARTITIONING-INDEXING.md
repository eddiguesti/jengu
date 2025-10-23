# Task11 — Partition & Index `pricing_data` + Read Replica for Analytics

## Why (Urgency)

Time-series growth requires partitioning for query speed and cost control.

## Scope

- Monthly partitions on `pricing_data`
- Indexes and query pruning
- Optional read replica for analytics-heavy reads

## Steps

1. **Partitioning**
   - Implement range partitioning by month on `date` column; migrate existing data with minimal downtime.
2. **Indexes**
   - `(propertyId,date)` and `(userId,date)`; verify with EXPLAIN ANALYZE.
3. **Read Replica**
   - Route analytics endpoints to replica via connection string envs.
4. **Maintenance**
   - Vacuum/analyze schedule; retention policy if applicable.

## Acceptance Criteria

- Representative queries exhibit 3–5× speedup.
- App logic unchanged; transparent to callers.

## Deliverables

- Migration SQL, query benchmarks, runbook.

## Risks

- Locking during migration; use rolling approach.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
