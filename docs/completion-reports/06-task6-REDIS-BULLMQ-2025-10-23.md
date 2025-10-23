# Task6 — Redis + BullMQ for Async Jobs (Enrichment, Competitors, Analytics)

## Why (Urgency)

Blocking enrichment and scraping degrade API responsiveness. Queue and scale workers.

## Scope

- Redis deployment
- BullMQ queues with backoff & DLQ
- Job status APIs + metrics

## Steps

1. **Infra**
   - Provision Redis; add env vars `REDIS_URL`.
2. **Queues**
   - Create queues: `enrichment`, `competitor`, `analytics-heavy`.
   - Workers in `/backend/workers/*` with concurrency env.
3. **API**
   - `/api/files/:id/enrich` → enqueue and return `jobId`.
   - `/api/jobs/:id` to poll; also emit WS events.
4. **Resilience**
   - Exponential backoff, retry up to N, DLQ with inspection route.
5. **Metrics**
   - Export queue depth and job durations (Prometheus).

## Acceptance Criteria

- Enrichment request returns < 150ms.
- Failed jobs retried; DLQ visible.
- Grafana shows queue depth and duration histograms.

## Deliverables

- Worker code, job APIs, dashboards.

## Risks

- Memory pressure on Redis; set TTL for job logs.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
