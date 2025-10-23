# Task13 — Smart Alerts Service (Demand, Competitors, Weather, Events)

## Why (Urgency)

Proactive insights drive retention and daily engagement.

## Scope

- Rule engine for alert conditions
- Nightly batch and on-change triggers
- Email digest (phase 1)

## Steps

1. **Rules**
   - Examples: comp median ↑ >10% vs 7d baseline; occupancy below target; forecasted weather spike; holiday in X days.
2. **Engine**
   - Evaluate per property nightly and on new data; de-dupe and throttle.
3. **Delivery**
   - Email digest with deep links to apply new price; later add in-app notifications.
4. **Settings**
   - Per-property thresholds and quiet hours.

## Acceptance Criteria

- Alerts generated with <15% false positives (tune thresholds).
- Opt-out/quiet-hours respected.

## Deliverables

- Rule engine, scheduler, email templates.

## Risks

- Alert fatigue; implement scoring and batching.

---

**Changelog**

- Generated: 2025-10-23

**Owner**

- Engineering Lead (assign in GitHub)

**Notes**

- Keep PRs small; one task per PR.
- Link Grafana/Sentry dashboards where relevant.
