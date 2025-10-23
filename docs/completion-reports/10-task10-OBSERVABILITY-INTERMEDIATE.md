# Task10 — Observability: Sentry + Prometheus/Grafana + Request IDs

## Why (Urgency)

End-to-end visibility to catch performance and errors.

## Scope

- Sentry on backend, workers, and pricing-service
- Prometheus metrics and Grafana dashboards
- Request/Job IDs across logs & traces

## Steps

1. **Tracing**
   - Add Sentry SDKs; tag `req_id`, `user_id`, `job_id`; capture exceptions and performance spans.
2. **Metrics**
   - Export histograms for: API latency by route, `/score` latency p95, job queue depth, enrichment duration.
3. **Dashboards**
   - Grafana with panels: API p95, queue depth, error rate, pricing latency.
4. **Alerts**
   - Alert when `/score` p95 > 80ms for 5 minutes or job failures exceed threshold.

## Acceptance Criteria

- Synthetic load test surfaces in dashboards.
- Alerts delivered to on-call channel/email.

## Deliverables

- Configs, dashboards JSON, alert rules.

## Risks

- Cardinality explosion; restrict labels carefully.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
