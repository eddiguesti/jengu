# Task18 — Contextual Bandit Pilot for Autonomous Optimization

## Why (Strategic)

Begin safe, incremental path toward autonomous, self-improving pricing.

## Scope

- Epsilon-greedy contextual bandit choosing among ML price ± deltas
- Reward: bookings × ADR (or expected revenue proxy)
- Safety guardrails (bounds, event/holiday clamps)

## Steps

1. **Context vector**
   - Use same features as ML model; normalize and log.
2. **Policy**
   - Start with ε=0.1 exploration; log chosen arm and reward.
3. **Safety**
   - Enforce price bounds; conservative mode on major events.
4. **Evaluation**
   - Offline replay first; then limited live canary on 5% of traffic.

## Acceptance Criteria

- Offline shows uplift vs ML-only baseline.
- Live pilot gated by feature flag per property; no guardrail breaches.

## Deliverables

- Bandit module, logging, evaluation report.

## Risks

- Non-stationarity; periodically reset or decay Q-values.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
