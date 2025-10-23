# Task3 — Enrichment Stabilization: Holidays + Weather Caching + Idempotency

## Why (Urgency)

Holiday enrichment disabled; weather calls slow and redundant. Make enrichment complete, fast, and repeatable.

## Scope

- Calendarific (or alternative) holiday enrichment
- Weather response caching by (lat,lng,date)
- Idempotent upsert for rows

## Steps

1. **Holiday enrichment**
   - Add `services/holidayService.ts`: fetch by country/year, cache table `holiday_cache(country, date, name)`.
   - Enrichment adds `isHoliday`, `holidayName`.
2. **Weather caching**
   - Introduce Redis or Postgres materialized views keyed by `(lat,lng,date)` for Open-Meteo/OpenWeather.
   - Background warmer for date ranges during upload.
3. **Idempotency**
   - Upsert on `pricing_data(propertyId, date)`, touch only missing/nullable columns.
4. **API & UI**
   - `/api/files/:id/enrich` returns stage timings; UI progress (see Task4).

## Acceptance Criteria

- Enrichment completes with holidays populated.
- Repeat runs don’t duplicate writes.
- Weather/holiday cache hit-rate ≥ 80% for re-runs.

## Deliverables

- Holiday cache table, weather cache strategy, metrics logs.

## Rollback

- Feature flag `HOLIDAYS_ENABLED=false` disables holiday path.

## Risks

- Holiday API quota; add daily cron and respect rate limits.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
