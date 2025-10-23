# Task5 — Extract Routes from server.ts & Publish OpenAPI

## Why (Urgency)

Single-file API is brittle; OpenAPI unlocks partners and SDK generation.

## Scope

- Modularize routes into `/backend/routes/*`
- Add schema validation & OpenAPI generation
- Swagger UI at `/docs`

## Steps

1. **Refactor**
   - Move feature routes: files, analytics, pricing, assistant, weather, competitor.
   - Keep `server.ts` as bootstrap (middleware, error handler, health).
2. **Schemas**
   - Use Zod or TypeBox for request/response validation.
   - Generate `openapi.json` via `zod-to-openapi` or `express-oas-generator`.
3. **Docs**
   - Serve Swagger UI at `/docs` (behind auth in non-dev).
4. **CI**
   - Validate `openapi.json` in pipeline and upload artifact.

## Acceptance Criteria

- `server.ts` < 300 LOC.
- `openapi.json` valid; endpoints documented with examples.

## Deliverables

- Modular routes, schemas, Swagger UI.

## Risks

- Divergence between code and spec; enforce via CI.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
