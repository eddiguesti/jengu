# Task12 — Partner API: Publish OpenAPI & Generate SDKs

## Why (Urgency)

Enable integrations and partnerships with a stable contract.

## Scope

- Finalize OpenAPI (Task5)
- Generate TS + Python SDKs
- API keys & rate limits

## Steps

1. **Keys**
   - Workspace-scoped API keys with roles and quotas.
2. **SDKs**
   - Auto-generate using `openapi-generator` for TS and Python; publish to GitHub Packages.
3. **Docs**
   - `/docs` with quickstart snippets (curl/TS/Python).
4. **Samples**
   - Example app calling `/api/pricing/quote` and `/api/analytics/summary` with API key auth.

## Acceptance Criteria

- External sample consumes SDK and retrieves prices.
- Rate limiting enforces quotas with 429 + `Retry-After`.

## Deliverables

- SDK packages, docs site, sample app.

## Risks

- Spec drift; keep generator in CI to diff changes.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
