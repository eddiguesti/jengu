# Task4 — React Query + Realtime Enrichment Progress

## Why (Urgency)

Server-state is not cached and enrichment has user-visible delay. Improve perceived speed and transparency.

## Scope

- Introduce React Query across data pages
- Realtime progress via Supabase Realtime or WS
- UX: skeleton loaders & optimistic refresh

## Steps

1. **Client state**
   - Install and configure React Query provider.
   - Wrap calls: `/api/files`, `/api/files/:id/data`, `/api/analytics/*`.
2. **Progress channel**
   - Backend emits `enrichment:{propertyId}` events with `{stage, pct}`.
   - Frontend subscribes and shows live progress bar.
3. **UX polish**
   - Skeletons for DirectorDashboard charts; cacheTime and staleTime tuned.
4. **Tests**
   - Route changes use cached data (no spinner flash).
   - Progress events update UI in near real-time.

## Acceptance Criteria

- Analytics pages rehydrate < 300ms when cached.
- Enrichment shows progress; final toast on completion.

## Deliverables

- Query hooks, event channel, and UI components.

## Risks

- Over-aggressive staleTime; tune per endpoint.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
