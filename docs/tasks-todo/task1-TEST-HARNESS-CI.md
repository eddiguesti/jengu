# Task1 — Minimal Test Harness & CI Baseline

## Why (Urgency)

No automated test safety net for backend & pricing-service. Establish CI to prevent regressions and measure coverage.

## Scope

- Backend (Node/Express, TypeScript): Jest + ts-jest
- Pricing Service (FastAPI, Python): pytest
- GitHub Actions pipeline

## Prerequisites

- Node 20+, Python 3.11+
- pnpm workspace configured

## Steps

1. **Backend tests**
   - Add `jest.config.ts`, `ts-jest`, and `@types/jest`.
   - Create `/backend/__tests__/server.smoke.test.ts` covering:
     - GET `/health` 200
     - Auth guard returns 401 on protected route
     - Rate limit returns 429 when exceeded
     - Pricing proxy happy path (mock FastAPI)
     - Error handler returns 500 with safe payload
   - Add fixtures under `/backend/__tests__/fixtures/`.
2. **Pricing-service tests**
   - Add `pytest` with `httpx.AsyncClient` to hit `/health` & `/score` (with minimal payload).
   - Mock `pricing_engine.calculate_price` error path to assert fallback payload shape.
3. **Coverage**
   - Configure coverage reporters (lcov for TS, xml for pytest).
4. **GitHub Actions**
   - Workflow `.github/workflows/check-all.yml` to run:
     - `pnpm i -w && pnpm -w run lint && pnpm -w run type-check && pnpm -w run test`
     - `pip install -r pricing-service/requirements.txt && pytest -q`
   - Cache pnpm and pip.
5. **Branch protection**
   - Require `check-all` to pass before merge.

## Acceptance Criteria

- CI fails on any failing test.
- Coverage summary prints in job logs.
- Intentional break in `server.ts` route causes red build.

## Deliverables

- Tests in repo, passing CI.
- `check-all.yml` workflow artifact.

## Rollback

- Revert workflow + test folders; no runtime impact.

## Risks

- Flaky tests → quarantine list & fix promptly.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
