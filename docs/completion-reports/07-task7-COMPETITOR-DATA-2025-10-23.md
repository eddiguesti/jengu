# Task7 — Competitor Data MVP (Daily Bands)

## Why (Urgency)
Market intelligence is essential for credible dynamic pricing.

## Scope
- Playwright scraping module (configurable targets)
- Proxy rotation, robots.txt awareness
- Store daily `comp_price_p10/p50/p90`

## Steps
1) **Scraper service**
   - New worker `competitor-scraper` pulling targets from DB.
   - Normalize property metadata (geo, room type, rating).
2) **Storage**
   - Table `competitor_daily(propertyId,date,p10,p50,p90,source)` with unique index.
3) **Integration**
   - Pricing engine uses comp bands when available; fall back gracefully.
4) **Scheduling**
   - Daily cron via queue to refresh next 14–30 days.

## Acceptance Criteria
- Test property shows populated comp bands.
- Pricing reasons include comparison vs market median.

## Deliverables
- Scraper worker, storage schema, integration tests.

## Risks
- Site changes break scrapers → monitor & quick patching.

---

**Changelog**
- Generated: 2025-10-23

**Owner**
- Engineering Lead (assign in GitHub)

**Notes**
- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
