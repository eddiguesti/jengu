# Database Partitioning Migration Runbook

**Complete guide for migrating pricing_data to monthly range partitions**

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Steps](#migration-steps)
- [Post-Migration Verification](#post-migration-verification)
- [Rollback Procedure](#rollback-procedure)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [Performance Monitoring](#performance-monitoring)

---

## Overview

### What This Migration Does

Converts the `pricing_data` table from a standard PostgreSQL table to a **range-partitioned** table with **monthly partitions**.

### Why Partition?

- **Performance**: 3-5x faster queries with date-range filters
- **Manageability**: Easier to archive/delete old data
- **Scalability**: Better handles time-series data growth
- **Cost**: Reduced I/O and storage costs

### Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Property + date range query | 250ms | 50ms | 5.0x |
| Analytics aggregation | 1200ms | 400ms | 3.0x |
| Recent data fetch | 150ms | 30ms | 5.0x |
| Buffer usage | 100% | 30% | 70% reduction |

---

## Prerequisites

###  1. Database Requirements

- ✅ PostgreSQL 10+ (for native partitioning)
- ✅ Supabase Pro plan or self-hosted Postgres
- ✅ Sufficient disk space (2x current `pricing_data` size)
- ✅ Database user with DDL permissions (CREATE TABLE, ALTER TABLE)

### 2. Access Requirements

- ✅ Direct database access (psql, pgAdmin, or Supabase SQL editor)
- ✅ Backend deployment access (for env vars)
- ✅ Monitoring access (Grafana, Sentry)

### 3. Backup Requirements

- ✅ Full database backup completed
- ✅ Backup verified and restorable
- ✅ Backup stored in separate location

### 4. Downtime Window

- ✅ **Maintenance window scheduled**: 2-4 AM (low traffic)
- ✅ **Estimated downtime**: 5-15 minutes
- ✅ **Stakeholders notified**: 24 hours in advance

---

## Pre-Migration Checklist

### 1. Take Baseline Measurements

```bash
cd backend/scripts
psql -U postgres -d your_database -f benchmark-queries.sql > baseline-before.txt
```

**Save output** for post-migration comparison.

### 2. Backup Database

**Option A: Supabase Dashboard**
1. Navigate to Database → Backups
2. Click "Create backup"
3. Wait for completion
4. Verify backup exists

**Option B: pg_dump**
```bash
pg_dump -h your-host -U your-user -d your-database -F c -f pricing_data_backup_$(date +%Y%m%d).dump
```

**Verify backup:**
```bash
pg_restore --list pricing_data_backup_20251023.dump | grep pricing_data
```

### 3. Check Data Quality

```sql
-- Check for NULL dates (must fix before partitioning)
SELECT count(*) as null_dates FROM pricing_data WHERE date IS NULL;

-- Fix NULL dates if any
UPDATE pricing_data
SET date = COALESCE(date, "createdAt"::date, CURRENT_DATE)
WHERE date IS NULL;

-- Verify date range
SELECT
  min(date) as earliest_date,
  max(date) as latest_date,
  count(*) as total_rows
FROM pricing_data;
```

### 4. Estimate Migration Time

```sql
-- Get table size
SELECT pg_size_pretty(pg_total_relation_size('pricing_data')) as size;

-- Estimate: ~1 minute per 100MB
-- Example: 1GB table ≈ 10 minutes
```

### 5. Notify Team

**Email Template:**

```
Subject: [SCHEDULED MAINTENANCE] Database Partitioning Migration

When: [DATE] at 2:00 AM - 2:30 AM [TIMEZONE]
Impact: ~15 minutes of reduced performance
Affected: Analytics dashboard, recent data queries

What's happening:
We're migrating the pricing_data table to use monthly partitions for
improved query performance. Most users won't notice, but background
analytics jobs may be slightly delayed.

Questions? Contact: engineering@company.com
```

---

## Migration Steps

### Step 1: Enter Maintenance Mode (Optional)

**Option A: Backend flag**
```bash
# Set in .env
MAINTENANCE_MODE=true

# Restart backend
pm2 restart backend
```

**Option B: Nginx redirect**
```nginx
# /etc/nginx/sites-enabled/default
location /api {
  return 503 "Maintenance in progress";
}
```

### Step 2: Run Partition Migration

**Connect to database:**
```bash
psql -h your-host -U postgres -d your-database
```

**Execute migration:**
```sql
\i backend/migrations/partition_pricing_data.sql
```

**Expected output:**
```
ALTER TABLE
CREATE TABLE
CREATE TABLE (36x for partitions)
CREATE INDEX (8x for indexes)
INSERT 0 1234567
✓ Rows match: true
VACUUM
```

**Watch for errors:**
- ❌ `ERROR: partition bound ... conflicts with existing partition` → Date range overlap (fix partition boundaries)
- ❌ `ERROR: cannot create index on partitioned table` → Index already exists (safe to ignore)
- ❌ `ERROR: out of memory` → Reduce batch size in migration script

### Step 3: Verify Data Integrity

```sql
-- Compare row counts
SELECT
  (SELECT count(*) FROM pricing_data) as new_count,
  (SELECT count(*) FROM pricing_data_backup) as old_count,
  (SELECT count(*) FROM pricing_data) = (SELECT count(*) FROM pricing_data_backup) as counts_match;

-- Expected: counts_match = true
```

If counts don't match, **STOP** and investigate.

### Step 4: Update Backend Code (if needed)

Most queries work unchanged with partitioning, but verify:

**❌ Bad: Queries without partition key**
```typescript
// Missing date filter - will scan all partitions
const data = await supabase.from('pricing_data').select('*').eq('propertyId', id);
```

**✅ Good: Include date in WHERE clause**
```typescript
// Includes date - partition pruning active
const data = await supabase
  .from('pricing_data')
  .select('*')
  .eq('propertyId', id)
  .gte('date', startDate)
  .lte('date', endDate);
```

### Step 5: Exit Maintenance Mode

```bash
# Unset maintenance flag
MAINTENANCE_MODE=false

# Restart backend
pm2 restart backend

# Or reload Nginx
sudo nginx -s reload
```

---

## Post-Migration Verification

### 1. Run Performance Benchmarks

```bash
cd backend/scripts
psql -U postgres -d your-database -f benchmark-queries.sql > baseline-after.txt

# Compare results
diff baseline-before.txt baseline-after.txt
```

**Expected improvements:**
- Execution time: 3-5x faster for date-range queries
- Buffers read: 50-70% reduction
- EXPLAIN plans show "Partitions scanned: 1" (not all)

### 2. Check Partition Distribution

```sql
SELECT
  tableoid::regclass as partition_name,
  count(*) as rows,
  pg_size_pretty(pg_total_relation_size(tableoid)) as size,
  min(date) as min_date,
  max(date) as max_date
FROM pricing_data
GROUP BY tableoid
ORDER BY partition_name;
```

**Expected:**
- Each partition contains ~1 month of data
- No overlapping date ranges
- Recent partitions have most data

### 3. Verify Application Functionality

**Test critical endpoints:**
- [ ] `GET /api/properties/:id/pricing-data` - Property data fetch
- [ ] `POST /api/properties/:id/upload-csv` - CSV upload
- [ ] `GET /api/analytics/demand-forecast` - Analytics query
- [ ] `GET /api/dashboard/director` - Dashboard load

**Check logs for errors:**
```bash
tail -f /var/log/backend/error.log | grep pricing_data
```

### 4. Monitor Performance Metrics

**Grafana dashboards:**
- API latency (should decrease)
- Database query time (should decrease)
- Error rate (should remain stable)

**Sentry:**
- No new database errors
- No query timeout errors

### 5. Verify Read Replica (if configured)

```typescript
// backend/scripts/test-replica.ts
import { runHealthChecks } from '../config/database';

await runHealthChecks();
// Expected:
// Primary: ✓ Healthy
// Replica: ✓ Healthy
// Replication Lag: <1s
```

---

## Rollback Procedure

**If migration fails or causes issues, rollback immediately:**

### Quick Rollback (within 24 hours)

```sql
-- 1. Drop partitioned table
DROP TABLE pricing_data;

-- 2. Restore backup table
ALTER TABLE pricing_data_backup RENAME TO pricing_data;

-- 3. Recreate indexes
CREATE INDEX idx_pricing_data_property_date ON pricing_data ("propertyId", date);
CREATE INDEX idx_pricing_data_date ON pricing_data (date);

-- 4. Vacuum
VACUUM ANALYZE pricing_data;
```

**Restart backend:**
```bash
pm2 restart backend
```

**Verify rollback:**
```sql
SELECT count(*) FROM pricing_data;
```

### Full Restore (from backup file)

```bash
# Stop backend
pm2 stop backend

# Drop current database
dropdb your-database

# Restore from backup
createdb your-database
pg_restore -d your-database pricing_data_backup_20251023.dump

# Start backend
pm2 start backend
```

---

## Maintenance

### Automated Partition Management

**Set up pg_cron for monthly maintenance:**

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule partition maintenance (1st of month at 2 AM)
SELECT cron.schedule(
  'partition-maintenance',
  '0 2 1 * *',
  $$SELECT run_partition_maintenance(3, 36, TRUE)$$
);

-- Verify schedule
SELECT * FROM cron.job WHERE jobname = 'partition-maintenance';
```

**Or use system cron:**
```bash
# Add to crontab
0 2 1 * * psql -d your-database -f backend/scripts/maintain-partitions.sql
```

### Manual Partition Creation

**Create next month's partition:**
```sql
CREATE TABLE pricing_data_2026_11 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
```

### Partition Cleanup

**Drop old partitions (after retention period):**
```sql
-- Drop partition older than 3 years
DROP TABLE pricing_data_2022_01;

-- Verify partition dropped
SELECT tablename FROM pg_tables WHERE tablename LIKE 'pricing_data_2022%';
```

---

## Troubleshooting

### Issue 1: High Replication Lag

**Symptoms:**
- Read replica shows stale data
- Replication lag > 5 seconds

**Diagnosis:**
```sql
-- Check replication status
SELECT * FROM pg_stat_replication;

-- Check replica lag
SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as lag_seconds;
```

**Solutions:**
1. **Increase replica instance size** (may be under-resourced)
2. **Reduce write load on primary** (batch uploads)
3. **Check network latency** (cross-region replication)

### Issue 2: Query Still Slow After Partitioning

**Symptoms:**
- Queries not showing expected speedup
- EXPLAIN shows "Seq Scan" instead of "Index Scan"

**Diagnosis:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM pricing_data
WHERE "propertyId" = 'test' AND date >= '2025-10-01' AND date < '2025-11-01';
```

**Look for:**
- "Partitions scanned: 1" ← Good (partition pruning working)
- "Partitions scanned: 36" ← Bad (partition pruning not working)
- "Index Scan" ← Good
- "Seq Scan" ← Bad (missing/unused index)

**Solutions:**
1. **Add date filter to WHERE clause** (enables partition pruning)
2. **Run ANALYZE** to update statistics:
   ```sql
   ANALYZE pricing_data;
   ```
3. **Check index usage:**
   ```sql
   SELECT * FROM pg_stat_user_indexes WHERE tablename LIKE 'pricing_data%';
   ```
4. **Recreate indexes** if missing:
   ```sql
   REINDEX TABLE pricing_data;
   ```

### Issue 3: "Partition Already Exists" Error

**Error:**
```
ERROR: relation "pricing_data_2025_10" already exists
```

**Solution:**
```sql
-- Check existing partitions
SELECT tablename FROM pg_tables WHERE tablename LIKE 'pricing_data_%' ORDER BY tablename;

-- Drop duplicate partition
DROP TABLE IF EXISTS pricing_data_2025_10;

-- Recreate partition
CREATE TABLE pricing_data_2025_10 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

### Issue 4: Missing Partition for Current Month

**Symptoms:**
- INSERT fails with "no partition of relation ... found for row"
- Data not appearing in recent queries

**Solution:**
```sql
-- Create missing partition
CREATE TABLE pricing_data_2025_10 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Verify partition created
SELECT * FROM pg_tables WHERE tablename = 'pricing_data_2025_10';
```

**Prevent future issues:**
- Set up automated partition creation (see Maintenance section)
- Create partitions 3 months in advance

### Issue 5: Out of Memory During Migration

**Error:**
```
ERROR: out of memory
DETAIL: Failed on request of size X
```

**Solution:**
1. **Increase work_mem temporarily:**
   ```sql
   SET work_mem = '256MB';
   ```

2. **Migrate in batches:**
   ```sql
   -- Instead of: INSERT INTO pricing_data SELECT * FROM pricing_data_old;
   -- Do:
   INSERT INTO pricing_data
   SELECT * FROM pricing_data_old WHERE date >= '2023-01-01' AND date < '2023-02-01';
   -- Repeat for each month
   ```

3. **Vacuum between batches:**
   ```sql
   VACUUM ANALYZE pricing_data;
   ```

---

## Performance Monitoring

### Key Metrics to Track

**Query Performance:**
- Average query time (should decrease 3-5x)
- P95 latency for analytics endpoints
- Database CPU usage (should decrease)

**Partition Health:**
- Number of partitions
- Size per partition
- Rows per partition

**Replication (if using replica):**
- Replication lag (should be < 5s)
- Replica query load
- Failover readiness

### Grafana Dashboards

**Create dashboard panels for:**

1. **Query Latency by Endpoint**
```promql
histogram_quantile(0.95, rate(pricing_api_latency_seconds_bucket{endpoint="/api/analytics/*"}[5m]))
```

2. **Database Query Time**
```promql
rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m])
```

3. **Partition Size**
```sql
-- Export to Prometheus via custom exporter
SELECT
  partition_name,
  pg_total_relation_size(partition_name::regclass) as size_bytes
FROM (
  SELECT tablename as partition_name
  FROM pg_tables
  WHERE tablename LIKE 'pricing_data_%'
) partitions;
```

### Alerts to Configure

**Critical:**
- 🔴 Partition creation failed
- 🔴 Query timeout rate > 1%
- 🔴 Replication lag > 60s

**Warning:**
- 🟡 Missing partition for next month
- 🟡 Partition size > 10GB
- 🟡 Replication lag > 10s

---

## Success Criteria

Migration is successful when:

- ✅ All data migrated (row counts match)
- ✅ Query performance improved 3-5x
- ✅ No application errors
- ✅ Partition pruning active (EXPLAIN shows single partition scanned)
- ✅ Automated maintenance scheduled
- ✅ Monitoring and alerts configured
- ✅ Team trained on new partition structure

---

## Additional Resources

- **PostgreSQL Partitioning Docs**: https://www.postgresql.org/docs/current/ddl-partitioning.html
- **Supabase Database Guide**: https://supabase.com/docs/guides/database
- **Migration SQL**: [backend/migrations/partition_pricing_data.sql](../../backend/migrations/partition_pricing_data.sql)
- **Maintenance Script**: [backend/scripts/maintain-partitions.sql](../../backend/scripts/maintain-partitions.sql)
- **Benchmark Script**: [backend/scripts/benchmark-queries.sql](../../backend/scripts/benchmark-queries.sql)

---

## Support

**Questions or issues during migration?**

1. Check [Troubleshooting](#troubleshooting) section
2. Review migration logs for errors
3. Contact: engineering-team@company.com
4. Emergency rollback: See [Rollback Procedure](#rollback-procedure)

---

**Last Updated**: 2025-10-23
**Maintained By**: Engineering Team
**Next Review**: 2026-01-01
