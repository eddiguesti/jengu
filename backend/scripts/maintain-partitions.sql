-- ========================================
-- AUTOMATED PARTITION MAINTENANCE
-- ========================================
-- This script automates partition management for pricing_data:
--   1. Creates future partitions (3 months ahead)
--   2. Drops old partitions beyond retention period (optional)
--   3. Runs VACUUM and ANALYZE for optimization
--
-- **SCHEDULE**: Run monthly via cron or pg_cron
-- **RECOMMENDED**: First day of each month at 2 AM
--
-- Cron setup:
--   0 2 1 * * psql -U postgres -d your_db -f maintain-partitions.sql
--
-- pg_cron setup:
--   SELECT cron.schedule('maintain-partitions', '0 2 1 * *', $$
--     -- SQL from this file
--   $$);
--
-- Author: Engineering Team
-- Date: 2025-10-23
-- ========================================

-- ========================================
-- FUNCTION: CREATE FUTURE PARTITIONS
-- ========================================

CREATE OR REPLACE FUNCTION create_future_partitions(months_ahead INT DEFAULT 3)
RETURNS void AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  partition_exists BOOLEAN;
BEGIN
  -- Loop through next N months
  FOR i IN 1..months_ahead LOOP
    -- Calculate partition dates
    partition_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL);
    start_date := partition_date;
    end_date := partition_date + INTERVAL '1 month';

    -- Generate partition name (e.g., pricing_data_2026_03)
    partition_name := 'pricing_data_' || to_char(partition_date, 'YYYY_MM');

    -- Check if partition already exists
    SELECT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = partition_name
        AND n.nspname = 'public'
    ) INTO partition_exists;

    -- Create partition if it doesn't exist
    IF NOT partition_exists THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF pricing_data FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        start_date,
        end_date
      );

      RAISE NOTICE 'Created partition: % for range % to %', partition_name, start_date, end_date;
    ELSE
      RAISE NOTICE 'Partition % already exists, skipping', partition_name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- FUNCTION: DROP OLD PARTITIONS
-- ========================================

CREATE OR REPLACE FUNCTION drop_old_partitions(retention_months INT DEFAULT 36)
RETURNS void AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE;
  partition_start DATE;
BEGIN
  -- Calculate cutoff date (e.g., 36 months ago)
  cutoff_date := date_trunc('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);

  RAISE NOTICE 'Dropping partitions older than: %', cutoff_date;

  -- Find and drop old partitions
  FOR partition_record IN
    SELECT
      c.relname as partition_name,
      pg_get_expr(c.relpartbound, c.oid) as partition_bound
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = 'pricing_data'
      AND c.relname LIKE 'pricing_data_%'
    ORDER BY c.relname
  LOOP
    -- Extract start date from partition name (e.g., pricing_data_2023_01 -> 2023-01-01)
    BEGIN
      partition_start := to_date(
        substring(partition_record.partition_name from '\d{4}_\d{2}'),
        'YYYY_MM'
      );

      -- Drop if older than cutoff
      IF partition_start < cutoff_date THEN
        EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
        RAISE NOTICE 'Dropped partition: % (start date: %)', partition_record.partition_name, partition_start;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not parse partition date from: %', partition_record.partition_name;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- FUNCTION: VACUUM AND ANALYZE PARTITIONS
-- ========================================

CREATE OR REPLACE FUNCTION vacuum_analyze_partitions()
RETURNS void AS $$
DECLARE
  partition_record RECORD;
BEGIN
  RAISE NOTICE 'Starting VACUUM ANALYZE for pricing_data partitions';

  FOR partition_record IN
    SELECT c.relname as partition_name
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = 'pricing_data'
      AND c.relname LIKE 'pricing_data_%'
    ORDER BY c.relname DESC  -- Start with most recent
    LIMIT 6  -- Only vacuum last 6 months (most active)
  LOOP
    EXECUTE format('VACUUM ANALYZE %I', partition_record.partition_name);
    RAISE NOTICE 'Vacuumed and analyzed: %', partition_record.partition_name;
  END LOOP;

  -- Also vacuum the parent table
  VACUUM ANALYZE pricing_data;
  RAISE NOTICE 'Vacuumed and analyzed parent table: pricing_data';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- FUNCTION: PARTITION HEALTH CHECK
-- ========================================

CREATE OR REPLACE FUNCTION check_partition_health()
RETURNS TABLE(
  status TEXT,
  partition_name TEXT,
  row_count BIGINT,
  size_mb NUMERIC,
  min_date DATE,
  max_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN count(*) = 0 THEN '⚠️  EMPTY'
      WHEN count(*) < 100 THEN 'ℹ️  SMALL'
      WHEN count(*) > 1000000 THEN '⚠️  LARGE'
      ELSE '✓ OK'
    END as status,
    tableoid::regclass::text as partition_name,
    count(*) as row_count,
    ROUND(pg_total_relation_size(tableoid) / 1024.0 / 1024.0, 2) as size_mb,
    min(date) as min_date,
    max(date) as max_date
  FROM pricing_data
  GROUP BY tableoid
  ORDER BY partition_name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- FUNCTION: DETECT MISSING PARTITIONS
-- ========================================

CREATE OR REPLACE FUNCTION detect_missing_partitions()
RETURNS TABLE(
  missing_month DATE,
  severity TEXT
) AS $$
DECLARE
  min_data_date DATE;
  max_data_date DATE;
  check_date DATE;
  partition_exists BOOLEAN;
BEGIN
  -- Get data date range
  SELECT min(date), max(date) INTO min_data_date, max_data_date
  FROM pricing_data_backup; -- Check against backup table if exists, else pricing_data

  IF min_data_date IS NULL THEN
    RAISE NOTICE 'No data found in pricing_data';
    RETURN;
  END IF;

  -- Check each month between min and max dates
  check_date := date_trunc('month', min_data_date);

  WHILE check_date <= date_trunc('month', max_data_date) + INTERVAL '3 months' LOOP
    -- Check if partition exists for this month
    SELECT EXISTS (
      SELECT 1
      FROM pg_class c
      WHERE c.relname = 'pricing_data_' || to_char(check_date, 'YYYY_MM')
    ) INTO partition_exists;

    IF NOT partition_exists THEN
      RETURN QUERY SELECT
        check_date,
        CASE
          WHEN check_date < CURRENT_DATE - INTERVAL '1 month' THEN '🔴 CRITICAL'
          WHEN check_date < CURRENT_DATE + INTERVAL '1 month' THEN '🟡 WARNING'
          ELSE '🟢 INFO'
        END;
    END IF;

    check_date := check_date + INTERVAL '1 month';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MAIN MAINTENANCE PROCEDURE
-- ========================================

CREATE OR REPLACE FUNCTION run_partition_maintenance(
  future_months INT DEFAULT 3,
  retention_months INT DEFAULT 36,
  drop_old BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting Partition Maintenance';
  RAISE NOTICE 'Timestamp: %', NOW();
  RAISE NOTICE '========================================';

  -- 1. Create future partitions
  RAISE NOTICE '';
  RAISE NOTICE '1. Creating future partitions (%  months ahead)', future_months;
  PERFORM create_future_partitions(future_months);

  -- 2. Drop old partitions (if enabled)
  IF drop_old THEN
    RAISE NOTICE '';
    RAISE NOTICE '2. Dropping old partitions (retention: % months)', retention_months;
    PERFORM drop_old_partitions(retention_months);
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '2. Skipping old partition cleanup (drop_old=false)';
  END IF;

  -- 3. Vacuum and analyze
  RAISE NOTICE '';
  RAISE NOTICE '3. Running VACUUM ANALYZE on recent partitions';
  PERFORM vacuum_analyze_partitions();

  -- 4. Health check
  RAISE NOTICE '';
  RAISE NOTICE '4. Partition Health Check:';
  RAISE NOTICE '';
  RAISE NOTICE 'Status | Partition Name | Rows | Size (MB) | Date Range';
  RAISE NOTICE '-------|----------------|------|-----------|------------';

  -- Display results (need to format manually in psql)

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Partition Maintenance Complete';
  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- EXECUTE MAINTENANCE
-- ========================================

-- Run maintenance (creates future partitions, no deletion)
SELECT run_partition_maintenance(
  future_months := 3,      -- Create 3 months ahead
  retention_months := 36,  -- Keep 36 months of data
  drop_old := FALSE        -- Don't drop old partitions (set TRUE in production)
);

-- Display health check
SELECT * FROM check_partition_health();

-- Check for missing partitions
SELECT * FROM detect_missing_partitions();

-- ========================================
-- MONITORING QUERIES
-- ========================================

-- View all partitions with statistics
SELECT
  schemaname,
  tablename as partition_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE tablename LIKE 'pricing_data_%'
ORDER BY tablename DESC
LIMIT 12;  -- Show last 12 months

-- View partition usage by month
SELECT
  tableoid::regclass as partition_name,
  to_char(date_trunc('month', min(date)), 'YYYY-MM') as month,
  count(*) as rows,
  pg_size_pretty(pg_total_relation_size(tableoid)) as size,
  count(DISTINCT "propertyId") as properties,
  count(DISTINCT "userId") as users
FROM pricing_data
GROUP BY tableoid, date_trunc('month', min(date))
ORDER BY month DESC
LIMIT 12;

-- Check query performance on partitioned table
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM pricing_data
WHERE "propertyId" = 'test-property-123'
  AND date BETWEEN '2025-10-01' AND '2025-10-31';

-- ========================================
-- CRON SETUP INSTRUCTIONS
-- ========================================

/*
### Option 1: pg_cron (recommended for production)

1. Enable pg_cron extension:
   CREATE EXTENSION IF NOT EXISTS pg_cron;

2. Schedule monthly maintenance:
   SELECT cron.schedule(
     'partition-maintenance',
     '0 2 1 * *',  -- 2 AM on 1st of each month
     $$SELECT run_partition_maintenance(3, 36, TRUE)$$
   );

3. View scheduled jobs:
   SELECT * FROM cron.job;

4. View job run history:
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;


### Option 2: System cron

Add to crontab (crontab -e):

```cron
# Pricing data partition maintenance - 1st of month at 2 AM
0 2 1 * * psql -h localhost -U postgres -d jengu_prod -f /path/to/maintain-partitions.sql >> /var/log/partition-maintenance.log 2>&1
```


### Option 3: GitHub Actions (for cloud deployments)

```yaml
name: Database Partition Maintenance
on:
  schedule:
    - cron: '0 2 1 * *'  # 1st of month at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  maintain-partitions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run partition maintenance
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          psql $DATABASE_URL -f backend/scripts/maintain-partitions.sql
```
*/

-- ========================================
-- MAINTENANCE COMPLETE
-- ========================================
-- Next steps:
--   1. Review partition health check output
--   2. Set up automated scheduling (pg_cron or cron)
--   3. Configure monitoring alerts for:
--      - Missing partitions
--      - Partition size exceeding thresholds
--      - Maintenance job failures
--   4. Update retention policy as needed
-- ========================================
