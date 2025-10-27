# Queue System (Redis + BullMQ)

## Overview

The Jengu backend uses Redis + BullMQ for async job processing to prevent blocking requests and improve API responsiveness. Long-running tasks like enrichment, competitor scraping, and heavy analytics are processed in background workers.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│  API Server  │────────▶│    Redis    │
│  (Frontend) │         │  (Enqueue)   │         │   (Queue)   │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         ▼
                        ┌──────────────┐         ┌─────────────┐
                        │   Database   │◀────────│   Workers   │
                        │  (Supabase)  │         │ (Process)   │
                        └──────────────┘         └─────────────┘
```

### Components

1. **API Server** - Receives requests, enqueues jobs, returns job IDs immediately
2. **Redis** - Message broker for job queues
3. **Workers** - Background processes that consume and execute jobs
4. **Database** - Stores job results and updates entity status

## Queues

### 1. Enrichment Queue (`enrichment`)

**Purpose**: Add weather, holidays, and temporal features to pricing data

**Job Data**:

```typescript
interface EnrichmentJobData {
  propertyId: string
  userId: string
  location: {
    latitude: number
    longitude: number
  }
  countryCode?: string
  calendarificApiKey?: string
}
```

**Configuration**:

- Concurrency: 3 workers (configurable via `ENRICHMENT_WORKER_CONCURRENCY`)
- Retry attempts: 5 (external API calls can fail)
- Backoff: Exponential starting at 5 seconds
- Rate limit: 10 jobs/minute

**Endpoints**:

- Enqueue: `POST /api/files/:id/enrich`
- Status: `GET /api/jobs/:jobId`

### 2. Competitor Queue (`competitor`)

**Purpose**: Scrape competitor pricing data

**Job Data**:

```typescript
interface CompetitorJobData {
  propertyId: string
  userId: string
  location: string
  checkIn: string
  checkOut: string
  adults: number
}
```

**Configuration**:

- Concurrency: 2 workers (configurable via `COMPETITOR_WORKER_CONCURRENCY`)
- Retry attempts: 3
- Backoff: Exponential starting at 5 seconds

### 3. Analytics Queue (`analytics-heavy`)

**Purpose**: Process computationally expensive analytics tasks

**Job Data**:

```typescript
interface AnalyticsJobData {
  propertyId: string
  userId: string
  analysisType: 'summary' | 'weather-impact' | 'demand-forecast' | 'feature-importance'
  data: unknown[]
  params?: Record<string, unknown>
}
```

**Configuration**:

- Concurrency: 2 workers (configurable via `ANALYTICS_WORKER_CONCURRENCY`)
- Retry attempts: 2 (fewer retries for deterministic failures)
- Backoff: Exponential starting at 5 seconds

## API Endpoints

### Job Management

#### GET /api/jobs/:jobId

Get status and progress of a specific job

**Response**:

```json
{
  "success": true,
  "job": {
    "id": "enrich-550e8400-1234567890",
    "status": "active",
    "progress": 45,
    "data": { ... },
    "attemptsMade": 1,
    "processedOn": 1734512345000
  }
}
```

**Status values**:

- `waiting` - Job is queued, waiting to be processed
- `active` - Job is currently being processed
- `completed` - Job finished successfully
- `failed` - Job failed after all retries
- `delayed` - Job is delayed (rate limiting or backoff)
- `not_found` - Job ID doesn't exist

#### GET /api/jobs

List all jobs for the authenticated user

**Query Parameters**:

- `queue` - Filter by queue name (`enrichment`, `competitor`, `analytics-heavy`)
- `status` - Filter by job status
- `limit` - Number of jobs to return (max 100, default 20)

**Response**:

```json
{
  "success": true,
  "jobs": [
    {
      "id": "enrich-550e8400-1234567890",
      "queue": "enrichment",
      "status": "completed",
      "progress": 100,
      "timestamp": 1734512345000
    }
  ],
  "total": 15
}
```

#### GET /api/jobs/dlq/list

View Dead Letter Queue (failed jobs)

**Response**:

```json
{
  "success": true,
  "failedJobs": [
    {
      "id": "enrich-550e8400-1234567890",
      "queue": "enrichment",
      "error": "Weather API timeout",
      "attemptsMade": 5,
      "failedAt": 1734512345000,
      "data": { ... }
    }
  ],
  "total": 3
}
```

#### POST /api/jobs/:jobId/retry

Retry a failed job

**Response**:

```json
{
  "success": true,
  "message": "Job retry initiated",
  "jobId": "enrich-550e8400-1234567890"
}
```

## Monitoring & Metrics

### GET /metrics

Prometheus-compatible metrics endpoint

**Metrics exposed**:

- `bullmq_queue_waiting_jobs` - Jobs waiting in queue
- `bullmq_queue_active_jobs` - Jobs currently processing
- `bullmq_queue_completed_jobs` - Total completed jobs
- `bullmq_queue_failed_jobs` - Total failed jobs
- `bullmq_queue_delayed_jobs` - Jobs delayed by rate limiting

**Example output**:

```prometheus
# HELP bullmq_queue_waiting_jobs Number of jobs waiting in queue
# TYPE bullmq_queue_waiting_jobs gauge
bullmq_queue_waiting_jobs{queue="enrichment"} 5
bullmq_queue_active_jobs{queue="enrichment"} 2
bullmq_queue_completed_jobs{queue="enrichment"} 143
bullmq_queue_failed_jobs{queue="enrichment"} 7
```

### GET /metrics/json

JSON format metrics for custom dashboards

**Response**:

```json
{
  "timestamp": "2024-12-18T10:30:00.000Z",
  "queues": {
    "enrichment": {
      "waiting": 5,
      "active": 2,
      "completed": 143,
      "failed": 7,
      "delayed": 0
    },
    "competitor": { ... },
    "analytics-heavy": { ... }
  }
}
```

## Development Setup

### 1. Install Redis

**Option A: Local Redis (Docker)**

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Option B: Upstash Redis (Free cloud)**

1. Sign up at [https://upstash.com/](https://upstash.com/)
2. Create a Redis database
3. Copy the connection URL

### 2. Configure Environment Variables

Add to `backend/.env`:

```bash
# Redis connection
REDIS_URL=redis://localhost:6379

# Worker concurrency
ENRICHMENT_WORKER_CONCURRENCY=3
COMPETITOR_WORKER_CONCURRENCY=2
ANALYTICS_WORKER_CONCURRENCY=2
```

### 3. Start Workers

Workers must run alongside the API server:

```bash
# Terminal 1: Start API server
cd backend
pnpm run dev

# Terminal 2: Start enrichment worker
cd backend
npx tsx workers/enrichmentWorker.ts
```

**Note**: In production, workers should run as separate processes/containers.

## Production Deployment

### Docker Compose Example

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru

  api:
    build: ./backend
    ports:
      - '3001:3001'
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - redis

  enrichment-worker:
    build: ./backend
    command: ['node', 'dist/workers/enrichmentWorker.js']
    environment:
      - REDIS_URL=redis://redis:6379
      - ENRICHMENT_WORKER_CONCURRENCY=5
    depends_on:
      - redis
    deploy:
      replicas: 2 # Scale workers horizontally

volumes:
  redis-data:
```

### Environment Variables

**Production recommendations**:

```bash
# Use Redis with persistence
REDIS_URL=redis://:password@production-redis:6379

# Scale workers based on load
ENRICHMENT_WORKER_CONCURRENCY=5
COMPETITOR_WORKER_CONCURRENCY=3
ANALYTICS_WORKER_CONCURRENCY=3
```

### Redis Configuration

**Recommended Redis settings**:

```redis
# Enable AOF persistence
appendonly yes

# Memory limits (prevent OOM)
maxmemory 2gb
maxmemory-policy allkeys-lru

# TTL for job logs (automatic cleanup)
# Set in BullMQ job options (already configured)

# Connection limits
maxclients 10000
```

## Grafana Dashboard

### Example Dashboard JSON

See `docs/monitoring/grafana-queue-dashboard.json` for a pre-built dashboard.

**Panels included**:

- Queue depth over time (line chart)
- Active jobs (gauge)
- Job completion rate (counter)
- Failure rate (counter)
- Job duration histogram

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'jengu-api'
    static_configs:
      - targets: ['api:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

## Error Handling & Resilience

### Retry Strategy

Jobs are automatically retried with exponential backoff:

1. **First attempt**: Immediate
2. **Second attempt**: 5 seconds delay
3. **Third attempt**: 25 seconds delay (5s × 5)
4. **Fourth attempt**: 125 seconds delay (25s × 5)
5. **Final attempt**: 625 seconds delay (125s × 5)

After all retries fail, job moves to Dead Letter Queue (DLQ).

### Dead Letter Queue

Failed jobs are kept for 7 days in the DLQ for inspection:

```bash
# View failed jobs
curl http://localhost:3001/api/jobs/dlq/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# Retry a failed job
curl -X POST http://localhost:3001/api/jobs/enrich-123/retry \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Common Failures

1. **External API timeout**
   - Cause: Weather/holiday API slow or down
   - Resolution: Automatic retry with backoff
   - Manual fix: Check API status, retry job

2. **Rate limiting**
   - Cause: Too many API requests
   - Resolution: Job automatically delayed
   - Prevention: Increase delay between jobs

3. **Database connection**
   - Cause: Supabase connection issue
   - Resolution: Worker auto-reconnects
   - Manual fix: Check Supabase status

4. **Invalid data**
   - Cause: Property deleted or invalid location
   - Resolution: Job fails immediately (no retry)
   - Manual fix: Update property data, retry

## Frontend Integration

### Polling for Job Status

```typescript
import { useEffect, useState } from 'react'

function useJobStatus(jobId: string) {
  const [status, setStatus] = useState('unknown')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!jobId) return

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      setStatus(data.job.status)
      setProgress(data.job.progress)

      // Stop polling when job completes or fails
      if (['completed', 'failed'].includes(data.job.status)) {
        clearInterval(pollInterval)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [jobId])

  return { status, progress }
}

// Usage
function EnrichmentProgress({ jobId }) {
  const { status, progress } = useJobStatus(jobId)

  return (
    <div>
      <p>Status: {status}</p>
      <ProgressBar value={progress} />
    </div>
  )
}
```

### WebSocket Alternative (Future Enhancement)

For real-time updates without polling, consider Socket.IO:

```typescript
// Server-side (future)
io.on('connection', socket => {
  enrichmentWorker.on('progress', (job, progress) => {
    socket.emit('job:progress', { jobId: job.id, progress })
  })
})

// Client-side (future)
socket.on('job:progress', ({ jobId, progress }) => {
  updateProgress(jobId, progress)
})
```

## Troubleshooting

### Workers not processing jobs

**Symptoms**: Jobs stuck in `waiting` state

**Causes & Solutions**:

1. Worker not running → Start worker with `npx tsx workers/enrichmentWorker.ts`
2. Redis not accessible → Check `REDIS_URL` and Redis server status
3. Worker crashed → Check worker logs for errors

### Jobs failing immediately

**Symptoms**: All jobs go to `failed` without retries

**Causes & Solutions**:

1. Invalid job data → Validate input before enqueuing
2. Missing env vars → Check API keys and config
3. Database permissions → Verify Supabase service role key

### Memory pressure on Redis

**Symptoms**: Redis OOM errors, jobs disappearing

**Solutions**:

1. Set `maxmemory` and `maxmemory-policy` in Redis
2. Reduce job retention TTL (currently 24h for completed, 7d for failed)
3. Scale Redis vertically or use Redis Cluster

### High latency on job status API

**Symptoms**: `/api/jobs/:id` takes >1s

**Causes**:

1. Too many jobs in queue → Increase workers or pagination
2. Redis slow queries → Check Redis `SLOWLOG`
3. Database query slow → Add indexes on properties table

**Solutions**:

- Cache job status in memory (with Redis expiry)
- Use WebSockets instead of polling
- Paginate job list queries

## Best Practices

### 1. Always Return Job ID Immediately

```typescript
// ✅ Good: Non-blocking
router.post('/enrich', async (req, res) => {
  const jobId = await enqueueEnrichment(data)
  res.json({ jobId, status: 'queued' })
})

// ❌ Bad: Blocking
router.post('/enrich', async (req, res) => {
  await enrichPropertyData(data) // Blocks for minutes!
  res.json({ success: true })
})
```

### 2. Implement Progress Updates

```typescript
await job.updateProgress(25) // 25% complete
await job.updateProgress(50) // 50% complete
await job.updateProgress(100) // Done
```

### 3. Set Appropriate Timeouts

```typescript
const job = await queue.add('task', data, {
  timeout: 300000, // 5 minutes max
})
```

### 4. Monitor Queue Depth

Alert if queue depth > 100 (jobs piling up faster than workers can process).

### 5. Graceful Shutdown

Workers wait for active jobs to complete before shutting down:

```typescript
process.on('SIGTERM', async () => {
  await worker.close() // Waits for active jobs
  process.exit(0)
})
```

## Security Considerations

1. **Job Ownership**: Always verify `userId` matches before returning job status
2. **Metrics Endpoint**: `/metrics` has no auth (for Prometheus scraping) - use firewall rules
3. **Rate Limiting**: Already enforced at queue level (10 enrichment jobs/minute)
4. **Input Validation**: Validate job data before enqueueing to prevent malicious payloads

## Performance Targets

| Metric                      | Target      | Current |
| --------------------------- | ----------- | ------- |
| Enqueue latency             | < 150ms     | ~50ms   |
| Job processing (enrichment) | < 2 minutes | ~90s    |
| Queue depth (normal load)   | < 50        | ~10     |
| Failed job rate             | < 5%        | ~2%     |
| Worker CPU usage            | < 60%       | ~30%    |

## Future Enhancements

1. **WebSocket real-time updates** - Replace polling with push notifications
2. **Job priority** - Urgent jobs processed first
3. **Scheduled jobs** - Cron-like recurring tasks
4. **Job chaining** - Auto-trigger analytics after enrichment completes
5. **Multi-tenancy** - Separate Redis instances per customer tier
6. **Auto-scaling workers** - Kubernetes HPA based on queue depth

---

**Last Updated**: 2025-10-23
