# Task15 — Competitor Graph & Neighborhood Index

## Why (Urgency)

Move beyond raw scraping to market positioning and defensible insights.

## Scope

- Graph modeling of competitors
- Neighborhood Competitive Index
- Director Dashboard visuals

## Steps

1. **Graph**
   - Build similarity edges by geo proximity, amenity vector, and review score.
2. **Index**
   - Compute daily index per property; store for trend charts.
3. **UI**
   - Radar or sparkline comparing property vs neighborhood index.
4. **Integration**
   - Pricing explanations include relative position.

## Acceptance Criteria

- Index correlates with price gaps; charts render with hover details.
- Explanations reference index where relevant.

## Deliverables

- Graph builder, index job, dashboard charts.

## Risks

- Sparse data; fall back to geo-only proximity.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
