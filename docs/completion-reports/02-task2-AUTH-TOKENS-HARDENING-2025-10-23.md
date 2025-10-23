# Task2 — Auth Hardening: httpOnly Cookies, Refresh Rotation, Structured Logs

## Why (Urgency)

LocalStorage tokens are vulnerable to XSS. Adopt httpOnly cookies, add refresh rotation and structured logging.

## Scope

- Token storage migration (access + refresh)
- Middleware logging (req_id, user_id)
- Docs update

## Steps

1. **Cookie strategy**
   - Access token: short-lived (15m) httpOnly, Secure, SameSite=Lax.
   - Refresh token: httpOnly, Secure, SameSite=Strict, rotation on use.
2. **Endpoints**
   - `/auth/login`: set both cookies, return user profile.
   - `/auth/refresh`: rotates refresh token, issues new access token.
   - `/auth/logout`: clears cookies.
3. **Middleware**
   - Generate `req_id` per request; log `req_id`, `user_id`, `route`, `status`, `latency_ms` via Pino.
4. **Front-end**
   - Remove localStorage usage; rely on cookie-based auth; Axios should send credentials `withCredentials: true`.
   - Handle 401 by calling `/auth/refresh` then retry once.
5. **Tests**
   - XSS test: document cannot read cookies.
   - 401/refresh flow e2e test.

## Acceptance Criteria

- Tokens not accessible via JS.
- Refresh rotates; replayed refresh token is rejected.
- Logs include req_id/user_id, searchable.

## Deliverables

- Updated auth routes & middleware.
- Doc: `/docs/developer/SUPABASE_SECURITY.md` add cookie design.

## Rollback

- Switch feature flag `AUTH_COOKIES=false` to revert to legacy (temporary only).

## Risks

- Mixed cookie domains in local/dev; document `.env` correctly.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
