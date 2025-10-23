# Task17 — Internal Bridge: gRPC or NATS for Node ↔ FastAPI

## Why (Latent)

After queues, reduce latency for synchronous pricing calls.

## Scope

- Replace REST with gRPC or NATS request-reply
- Canary + fallback to REST

## Steps

1. **POC**
   - Implement `/score` call via gRPC or NATS; measure latency under load.
2. **Feature flag**
   - Env-controlled switch; automatic fallback on failure.
3. **Observability**
   - Tag spans/metrics to compare transports.

## Acceptance Criteria

- ≥30% p95 latency reduction vs REST in load test.
- Automatic fallback works; no user-visible errors.

## Deliverables

- Bridge client/server, metrics, docs.

## Risks

- Operational complexity; only enable after solid monitoring.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
