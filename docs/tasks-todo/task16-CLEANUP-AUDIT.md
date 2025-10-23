# Task16 — Repo-wide Clean Up & Security Audit (Rolling)

## Why (Urgency)

Prevent entropy while velocity increases.

## Scope

- Dependency pruning, ESM-only imports, TS strictness
- `.env.example` parity, health checks
- Vulnerability scanning in CI

## Steps

1. **Hygiene**
   - `pnpm prune -w`, remove unused deps; enforce eslint/prettier in CI.
2. **Types**
   - Remove `any` in core paths: API services, Zustand stores, key components.
3. **Env parity**
   - Ensure `.env.example` matches required vars across services.
4. **Health checks**
   - Add `/health` rich status for Node and FastAPI (model readiness, queue up).

## Acceptance Criteria

- Audit checklist passes; doc stored in `/docs/CLEANUP-AUDIT.md`.
- CI fails on vulnerability scan until resolved.

## Deliverables

- Updated configs, audit report, CI job.

## Risks

- Over-strict lint may slow dev; allow temporary ignores with TODOs.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
