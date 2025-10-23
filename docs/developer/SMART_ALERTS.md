# Smart Alerts System

## Overview

The Smart Alerts system is a proactive alerting engine that monitors key business metrics and notifies users when action is required. Alerts are evaluated nightly and delivered via email digests or immediate notifications.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Smart Alerts                          │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ Alert Engine │ │  Scheduler   │ │   Delivery   │
      │   (Rules)    │ │  (Nightly)   │ │   (Email)    │
      └──────────────┘ └──────────────┘ └──────────────┘
              │               │               │
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  Database    │ │  Cron Jobs   │ │  SendGrid    │
      │   Tables     │ │  (2:00 AM)   │ │    API       │
      └──────────────┘ └──────────────┘ └──────────────┘
```

## Components

### 1. Alert Engine (`backend/services/alertEngine.ts`)

Evaluates alert rules and determines if alerts should be triggered.

**Supported Alert Types:**

- `competitor_price_spike` - Competitor median price increased significantly
- `competitor_price_drop` - Competitor median price decreased significantly
- `occupancy_low` - Occupancy below threshold
- `occupancy_high` - Occupancy above threshold (opportunity to raise prices)
- `demand_surge` - Booking rate increased significantly
- `demand_decline` - Booking rate decreased significantly
- `weather_event` - Severe weather forecasted
- `holiday_upcoming` - Holiday approaching (within N days)
- `price_optimization` - ML model suggests pricing adjustment

**Example Usage:**

```typescript
import { AlertEngine } from './services/alertEngine.js';

// Evaluate all active rules for a property
const alerts = await AlertEngine.evaluatePropertyRules(propertyId);

// Create alert records
for (const alert of alerts) {
  await AlertEngine.createAlert(alert);
}
```

### 2. Alert Scheduler (`backend/jobs/alertScheduler.ts`)

Runs nightly batch evaluation of all alert rules.

**Configuration (Environment Variables):**

- `ALERT_CRON_SCHEDULE` - Cron expression (default: `0 2 * * *` = 2:00 AM daily)
- `ALERT_BATCH_SIZE` - Number of properties to process in parallel (default: 10)
- `ENABLE_EMAIL_DIGEST` - Enable/disable email digests (default: true)

**Running the Scheduler:**

```bash
# Start scheduler (runs continuously)
node backend/jobs/alertScheduler.js

# Manual trigger (for testing)
import { manualTrigger } from './jobs/alertScheduler.js';
await manualTrigger();
```

### 3. Alert Delivery (`backend/services/alertDelivery.ts`)

Sends email notifications using SendGrid.

**Email Types:**

- **Daily Digest** - Summary of all alerts from last 24 hours
- **Single Alert** - Immediate notification for critical alerts

**Configuration:**

- `SENDGRID_API_KEY` - SendGrid API key
- `ALERT_FROM_EMAIL` - Sender email address (default: `alerts@jengu.app`)
- `ALERT_FROM_NAME` - Sender name (default: `Jengu Alerts`)
- `BASE_URL` - Base URL for links (default: `https://app.jengu.com`)

**Example Usage:**

```typescript
import { sendDailyDigest, sendSingleAlert } from './services/alertDelivery.js';

// Send daily digest to user
await sendDailyDigest(userId);

// Send single alert email
await sendSingleAlert(alertId);
```

## Database Schema

### Tables

#### `alert_rules`

Defines alert rules for properties.

| Column                | Type      | Description                              |
| --------------------- | --------- | ---------------------------------------- |
| id                    | UUID      | Primary key                              |
| userId                | UUID      | User who owns this rule                  |
| propertyId            | UUID      | Property to monitor                      |
| name                  | TEXT      | User-friendly rule name                  |
| rule_type             | TEXT      | Type of alert (see types above)          |
| conditions            | JSONB     | Rule-specific conditions                 |
| severity              | TEXT      | low, medium, high, critical              |
| priority              | INTEGER   | Priority for sorting (1-100)             |
| is_active             | BOOLEAN   | Whether rule is enabled                  |
| min_interval_hours    | INTEGER   | Minimum hours between alerts (throttling)|
| last_triggered_at     | TIMESTAMP | Last time alert was triggered            |
| trigger_count         | INTEGER   | Total times triggered                    |

**Example Rule:**

```json
{
  "name": "Competitor Price Alert",
  "rule_type": "competitor_price_spike",
  "conditions": {
    "threshold": 10,
    "timeframe": "7d"
  },
  "severity": "high",
  "min_interval_hours": 24
}
```

#### `alert_history`

Stores triggered alerts.

| Column              | Type      | Description                        |
| ------------------- | --------- | ---------------------------------- |
| id                  | UUID      | Primary key                        |
| alert_rule_id       | UUID      | FK to alert_rules                  |
| userId              | UUID      | User who owns this alert           |
| propertyId          | UUID      | Property this alert is about       |
| alert_type          | TEXT      | Type of alert                      |
| severity            | TEXT      | low, medium, high, critical        |
| priority            | INTEGER   | Priority for sorting               |
| title               | TEXT      | Alert title                        |
| message             | TEXT      | Alert message                      |
| data                | JSONB     | Alert-specific data                |
| action_url          | TEXT      | URL to take action                 |
| status              | TEXT      | pending, sent, dismissed, snoozed  |
| sent_at             | TIMESTAMP | When email was sent                |
| dismissed_at        | TIMESTAMP | When user dismissed                |
| snoozed_until       | TIMESTAMP | Snooze until this time             |

#### `alert_settings`

Per-user alert preferences.

| Column              | Type      | Description                        |
| ------------------- | --------- | ---------------------------------- |
| userId              | UUID      | User (primary key)                 |
| email_enabled       | BOOLEAN   | Enable email notifications         |
| email_frequency     | TEXT      | immediate, daily, weekly           |
| quiet_hours_start   | TIME      | Quiet hours start time (HH:MM)     |
| quiet_hours_end     | TIME      | Quiet hours end time (HH:MM)       |
| min_severity        | TEXT      | Only send alerts >= this severity  |

#### `alert_evaluation_log`

Logs all rule evaluations for debugging.

| Column              | Type      | Description                        |
| ------------------- | --------- | ---------------------------------- |
| id                  | UUID      | Primary key                        |
| alert_rule_id       | UUID      | FK to alert_rules                  |
| triggered           | BOOLEAN   | Whether alert was triggered        |
| reason              | TEXT      | Why triggered/not triggered        |
| evaluation_data     | JSONB     | Evaluation context and results     |
| evaluation_time_ms  | INTEGER   | Evaluation duration in ms          |
| evaluated_at        | TIMESTAMP | When evaluation occurred           |

### Helper Functions

#### `should_throttle_alert(p_alert_rule_id UUID)`

Checks if an alert should be throttled based on `min_interval_hours`.

```sql
SELECT should_throttle_alert('rule-id-here');
-- Returns: true/false
```

#### `is_in_quiet_hours(p_user_id UUID)`

Checks if current time is within user's quiet hours.

```sql
SELECT is_in_quiet_hours('user-id-here');
-- Returns: true/false
```

## API Endpoints

### Alert History

#### `GET /api/alerts`

List user's recent alerts.

**Query Parameters:**

- `status` - Filter by status (pending, sent, dismissed, snoozed)
- `severity` - Filter by severity (low, medium, high, critical)
- `propertyId` - Filter by property
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**

```json
{
  "alerts": [
    {
      "id": "alert-id",
      "title": "Competitor Prices Up 15%",
      "message": "Competitor median price increased...",
      "severity": "high",
      "status": "pending",
      "created_at": "2025-10-22T10:00:00Z",
      "property": {
        "name": "Downtown Hotel"
      }
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### `GET /api/alerts/:id`

Get alert details.

#### `POST /api/alerts/:id/dismiss`

Dismiss an alert.

#### `POST /api/alerts/:id/snooze`

Snooze an alert.

**Request Body:**

```json
{
  "hours": 24
}
```

#### `DELETE /api/alerts/:id`

Delete an alert.

### Alert Rules

#### `GET /api/alerts/rules`

List user's alert rules.

**Query Parameters:**

- `propertyId` - Filter by property
- `rule_type` - Filter by type
- `is_active` - Filter by active status

#### `POST /api/alerts/rules`

Create alert rule.

**Request Body:**

```json
{
  "propertyId": "property-id",
  "name": "Low Occupancy Alert",
  "rule_type": "occupancy_low",
  "conditions": {
    "threshold": 50
  },
  "severity": "medium",
  "min_interval_hours": 24
}
```

#### `PUT /api/alerts/rules/:id`

Update alert rule.

#### `DELETE /api/alerts/rules/:id`

Delete alert rule.

### Alert Settings

#### `GET /api/alerts/settings`

Get user's alert settings.

#### `PUT /api/alerts/settings`

Update user's alert settings.

**Request Body:**

```json
{
  "email_enabled": true,
  "email_frequency": "daily",
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00",
  "min_severity": "medium"
}
```

### Utility

#### `POST /api/alerts/test/:propertyId`

Manually trigger alert evaluation for a property (for testing).

## Email Templates

Templates use Mustache syntax and are located in `backend/email-templates/`.

### Daily Digest (`alert-digest.html`)

Variables:

- `{{date}}` - Current date
- `{{totalAlerts}}` - Total number of alerts
- `{{propertiesCount}}` - Number of properties with alerts
- `{{criticalCount}}` - Number of critical alerts
- `{{highCount}}` - Number of high alerts
- `{{mediumCount}}` - Number of medium alerts
- `{{lowCount}}` - Number of low alerts
- `{{#alerts}}...{{/alerts}}` - Loop over alerts
  - `{{title}}` - Alert title
  - `{{message}}` - Alert message
  - `{{severity}}` - Alert severity
  - `{{propertyName}}` - Property name
  - `{{createdAt}}` - When alert was created
  - `{{actionUrl}}` - URL to take action

### Single Alert (`single-alert.html`)

Variables:

- `{{severity}}` - Alert severity
- `{{title}}` - Alert title
- `{{message}}` - Alert message
- `{{propertyName}}` - Property name
- `{{propertyId}}` - Property ID
- `{{alertId}}` - Alert ID
- `{{triggeredAt}}` - When alert was triggered
- `{{actionUrl}}` - URL to take action
- `{{actionText}}` - Action button text
- `{{#data}}...{{/data}}` - Loop over data key-value pairs
  - `{{label}}` - Data field label
  - `{{value}}` - Data field value
- `{{#recommendations}}...{{/recommendations}}` - Loop over recommendations

## Setup Instructions

### 1. Run Database Migrations

```bash
# Run migration to create tables
psql -d your_database -f backend/migrations/add_smart_alerts_tables.sql
```

### 2. Configure Environment Variables

Add to `.env`:

```bash
# Alert Scheduler
ALERT_CRON_SCHEDULE=0 2 * * *
ALERT_BATCH_SIZE=10
ENABLE_EMAIL_DIGEST=true

# Email Delivery
SENDGRID_API_KEY=your_sendgrid_api_key
ALERT_FROM_EMAIL=alerts@jengu.app
ALERT_FROM_NAME=Jengu Alerts
BASE_URL=https://app.jengu.com
```

### 3. Install Dependencies

```bash
cd backend
pnpm install mustache cron
```

### 4. Start Alert Scheduler

**Option 1: Run as separate process**

```bash
node backend/jobs/alertScheduler.js
```

**Option 2: Integrate into main server**

Add to `backend/server.ts`:

```typescript
import { startAlertScheduler } from './jobs/alertScheduler.js';

// After app initialization
startAlertScheduler();
```

### 5. Create Default Alert Rules

Users can create alert rules via API or you can seed defaults:

```sql
INSERT INTO alert_rules (userId, propertyId, name, rule_type, conditions, severity, min_interval_hours)
VALUES
  ('user-id', 'property-id', 'Competitor Price Spike', 'competitor_price_spike',
   '{"threshold": 10, "timeframe": "7d"}'::jsonb, 'high', 24),
  ('user-id', 'property-id', 'Low Occupancy', 'occupancy_low',
   '{"threshold": 50}'::jsonb, 'medium', 24),
  ('user-id', 'property-id', 'High Demand', 'occupancy_high',
   '{"threshold": 85}'::jsonb, 'high', 24);
```

## Testing

### Manual Trigger

```bash
curl -X POST http://localhost:3001/api/alerts/test/property-id \
  -H "Authorization: Bearer your-jwt-token"
```

### Check Email Queue

```sql
SELECT * FROM email_queue WHERE status = 'pending';
```

### View Alert History

```sql
SELECT * FROM alert_history
WHERE userId = 'user-id'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Evaluation Log

```sql
SELECT * FROM alert_evaluation_log
WHERE alert_rule_id = 'rule-id'
ORDER BY evaluated_at DESC
LIMIT 10;
```

## Performance Considerations

### Batching

The scheduler processes properties in batches (default: 10) to avoid overwhelming the database.

### Throttling

Alert rules have a `min_interval_hours` setting to prevent alert fatigue. The `should_throttle_alert()` function checks if enough time has passed since the last trigger.

### Quiet Hours

Alerts triggered during quiet hours are marked as `pending` and sent in the next digest.

### Evaluation Logging

All evaluations are logged to `alert_evaluation_log` for debugging and performance monitoring. Consider archiving old logs periodically.

## Monitoring

### Key Metrics

- Alert evaluation duration (ms)
- Alerts triggered per day
- Email delivery success rate
- Rule evaluation failures

### Recommended Alerts

- Alert scheduler failed to run
- Email delivery failing
- Alert evaluation taking >30 seconds
- High number of throttled alerts (indicates too frequent evaluation)

## Future Enhancements

- [ ] SMS notifications via Twilio
- [ ] Slack/Teams integrations
- [ ] In-app notification center
- [ ] Alert rule templates
- [ ] ML-powered alert prioritization
- [ ] Alert correlation (group related alerts)
- [ ] Historical alert performance analytics
- [ ] A/B test alert copy for engagement

## Troubleshooting

### Alerts not being created

1. Check if rules are active: `SELECT * FROM alert_rules WHERE is_active = true`
2. Check evaluation log: `SELECT * FROM alert_evaluation_log ORDER BY evaluated_at DESC`
3. Verify data exists: Check `pricing_data` and `competitor_pricing` tables
4. Check throttling: `SELECT should_throttle_alert('rule-id')`

### Emails not sending

1. Verify SendGrid API key: `echo $SENDGRID_API_KEY`
2. Check email queue: `SELECT * FROM email_queue WHERE status = 'failed'`
3. Check SendGrid activity feed in dashboard
4. Verify user has email address: `SELECT email FROM users WHERE id = 'user-id'`

### Scheduler not running

1. Check if process is running: `ps aux | grep alertScheduler`
2. Check cron expression: `echo $ALERT_CRON_SCHEDULE`
3. Check job runs log: `SELECT * FROM job_runs WHERE job_name = 'alert_evaluation'`
4. Review server logs for errors

## Support

For questions or issues, contact the engineering team or file an issue in GitHub.
