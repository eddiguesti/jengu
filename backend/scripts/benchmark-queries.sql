-- ========================================
-- QUERY PERFORMANCE BENCHMARK
-- ========================================
-- This script benchmarks query performance before and after partitioning.
-- Run this BEFORE migration to establish baseline, then run AFTER
-- to measure improvements.
--
-- Expected improvements:
--   - 3-5x speedup for date-range queries
--   - 2-3x speedup for property-specific queries
--   - Reduced I/O and buffer usage
--
-- Usage:
--   psql -U postgres -d your_db -f benchmark-queries.sql > benchmark-results.txt
--
-- Author: Engineering Team
-- Date: 2025-10-23
-- ========================================

-- Enable timing
\timing on

-- Show query plans
SET client_min_messages TO NOTICE;

-- ========================================
-- PRE-BENCHMARK SETUP
-- ========================================

-- Warm up cache
SELECT pg_prewarm('pricing_data');

-- Clear statistics
SELECT pg_stat_reset();

-- Record start time
SELECT NOW() as benchmark_start_time \gset

\echo ''
\echo '========================================'
\echo 'Query Performance Benchmark'
\echo 'Started at:' :benchmark_start_time
\echo '========================================'
\echo ''

-- ========================================
-- BENCHMARK 1: Single Property + Date Range
-- ========================================
-- Most common query pattern: fetch data for one property over time

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 1: Single Property + Date Range'
\echo 'Query: Property data for 1 month'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM pricing_data
WHERE "propertyId" = (
  SELECT "propertyId"
  FROM pricing_data
  LIMIT 1
)
  AND date BETWEEN CURRENT_DATE - INTERVAL '1 month' AND CURRENT_DATE
ORDER BY date DESC;

-- ========================================
-- BENCHMARK 2: Multi-Property Analytics
-- ========================================
-- Analytics query: aggregate across all properties

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 2: Multi-Property Analytics'
\echo 'Query: Average price by month'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  date_trunc('month', date) as month,
  COUNT(*) as records,
  AVG(price) as avg_price,
  STDDEV(price) as price_stddev,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM pricing_data
WHERE date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY date_trunc('month', date)
ORDER BY month DESC;

-- ========================================
-- BENCHMARK 3: User-Level Aggregation
-- ========================================
-- Dashboard query: stats for all user's properties

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 3: User-Level Aggregation'
\echo 'Query: Stats for all user properties'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  "propertyId",
  COUNT(*) as data_points,
  AVG(price) as avg_price,
  AVG(occupancy) as avg_occupancy,
  SUM(bookings) as total_bookings
FROM pricing_data
WHERE "userId" = (
  SELECT "userId"
  FROM pricing_data
  WHERE "userId" IS NOT NULL
  LIMIT 1
)
  AND date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY "propertyId";

-- ========================================
-- BENCHMARK 4: Temporal Analysis
-- ========================================
-- ML query: analyze seasonal patterns

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 4: Temporal Analysis'
\echo 'Query: Seasonal price patterns'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  season,
  "dayOfWeek",
  "isWeekend",
  COUNT(*) as records,
  AVG(price) as avg_price,
  AVG(occupancy) as avg_occupancy,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
FROM pricing_data
WHERE date >= CURRENT_DATE - INTERVAL '1 year'
  AND "propertyId" = (
    SELECT "propertyId"
    FROM pricing_data
    LIMIT 1
  )
GROUP BY season, "dayOfWeek", "isWeekend"
ORDER BY season, "dayOfWeek";

-- ========================================
-- BENCHMARK 5: Recent Data Query
-- ========================================
-- Frequent query: last 7 days of data

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 5: Recent Data Query'
\echo 'Query: Last 7 days across all properties'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM pricing_data
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, "propertyId"
LIMIT 1000;

-- ========================================
-- BENCHMARK 6: Full Table Scan
-- ========================================
-- Worst case: full table scan without filters

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 6: Full Table Scan'
\echo 'Query: Count all records'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) as total_records
FROM pricing_data;

-- ========================================
-- BENCHMARK 7: Join with Properties
-- ========================================
-- Common pattern: join pricing data with property metadata

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 7: Join with Properties'
\echo 'Query: Pricing data with property names'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  p.name as property_name,
  pd.date,
  pd.price,
  pd.occupancy
FROM pricing_data pd
JOIN properties p ON p.id = pd."propertyId"
WHERE pd.date >= CURRENT_DATE - INTERVAL '1 month'
ORDER BY pd.date DESC
LIMIT 100;

-- ========================================
-- BENCHMARK 8: Complex Analytics
-- ========================================
-- Advanced query: moving averages and comparisons

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 8: Complex Analytics'
\echo 'Query: 7-day moving average'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  date,
  price,
  AVG(price) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as price_7day_ma,
  AVG(occupancy) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as occupancy_7day_ma
FROM pricing_data
WHERE "propertyId" = (
  SELECT "propertyId"
  FROM pricing_data
  LIMIT 1
)
  AND date >= CURRENT_DATE - INTERVAL '3 months'
ORDER BY date;

-- ========================================
-- BENCHMARK 9: Partition Pruning Test
-- ========================================
-- Test how well partition pruning works (after migration)

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 9: Partition Pruning Test'
\echo 'Query: Specific month (tests partition exclusion)'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) as records_in_month
FROM pricing_data
WHERE date >= '2025-10-01'
  AND date < '2025-11-01';

-- ========================================
-- BENCHMARK 10: Weekend/Holiday Filtering
-- ========================================
-- Test partial index performance

\echo ''
\echo '----------------------------------------'
\echo 'BENCHMARK 10: Weekend/Holiday Filtering'
\echo 'Query: Weekend pricing patterns'
\echo '----------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  "propertyId",
  AVG(price) as avg_weekend_price,
  COUNT(*) as weekend_records
FROM pricing_data
WHERE "isWeekend" = true
  AND date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY "propertyId";

-- ========================================
-- PERFORMANCE STATISTICS
-- ========================================

\echo ''
\echo '========================================'
\echo 'Database Statistics'
\echo '========================================'
\echo ''

-- Table statistics
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) as index_size,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE tablename LIKE 'pricing_data%'
ORDER BY tablename;

-- Index usage statistics
\echo ''
\echo 'Index Usage:'
\echo ''

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename LIKE 'pricing_data%'
ORDER BY idx_scan DESC;

-- Cache hit ratio
\echo ''
\echo 'Cache Hit Ratio:'
\echo ''

SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE tablename LIKE 'pricing_data%';

-- ========================================
-- BENCHMARK SUMMARY
-- ========================================

SELECT NOW() as benchmark_end_time \gset

\echo ''
\echo '========================================'
\echo 'Benchmark Complete'
\echo 'Started:' :benchmark_start_time
\echo 'Ended:' :benchmark_end_time
\echo '========================================'
\echo ''
\echo 'Next Steps:'
\echo '  1. Save this output for comparison'
\echo '  2. Run partition migration'
\echo '  3. Run this benchmark again'
\echo '  4. Compare execution times'
\echo '  5. Look for:'
\echo '     - Reduced execution time'
\echo '     - Lower buffer usage'
\echo '     - Partition pruning in EXPLAIN output'
\echo '     - Better index usage'
\echo ''

-- ========================================
-- COMPARISON TEMPLATE
-- ========================================

/*
Use this template to compare results:

QUERY                      | BEFORE | AFTER  | IMPROVEMENT
---------------------------|--------|--------|-------------
Single Property + Range    | 250ms  | 50ms   | 5.0x
Multi-Property Analytics   | 1200ms | 400ms  | 3.0x
User-Level Aggregation     | 800ms  | 200ms  | 4.0x
Temporal Analysis          | 600ms  | 180ms  | 3.3x
Recent Data Query          | 150ms  | 30ms   | 5.0x
Full Table Scan            | 2000ms | 1800ms | 1.1x
Join with Properties       | 300ms  | 90ms   | 3.3x
Complex Analytics          | 900ms  | 250ms  | 3.6x
Partition Pruning Test     | 100ms  | 15ms   | 6.7x
Weekend/Holiday Filtering  | 400ms  | 120ms  | 3.3x

Overall Average Improvement: 3.5x

Key Metrics:
  - Buffer usage reduced: 70%
  - Index scan ratio improved: 85% -> 95%
  - Partition pruning active: Yes
  - Cache hit ratio: 95% -> 98%
*/

-- ========================================
-- AUTOMATED COMPARISON SCRIPT
-- ========================================

-- Create results table for automated comparison
CREATE TABLE IF NOT EXISTS benchmark_results (
  id SERIAL PRIMARY KEY,
  benchmark_name TEXT NOT NULL,
  execution_time_ms NUMERIC NOT NULL,
  buffers_read INT,
  buffers_hit INT,
  partitions_scanned INT,
  rows_returned BIGINT,
  is_partitioned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example: Insert benchmark result
-- INSERT INTO benchmark_results (benchmark_name, execution_time_ms, buffers_read, buffers_hit, is_partitioned)
-- VALUES ('Single Property + Range', 250.5, 1000, 5000, FALSE);

-- Compare results
/*
SELECT
  benchmark_name,
  AVG(CASE WHEN is_partitioned = FALSE THEN execution_time_ms END) as before_ms,
  AVG(CASE WHEN is_partitioned = TRUE THEN execution_time_ms END) as after_ms,
  ROUND(
    AVG(CASE WHEN is_partitioned = FALSE THEN execution_time_ms END) /
    NULLIF(AVG(CASE WHEN is_partitioned = TRUE THEN execution_time_ms END), 0),
    2
  ) as improvement_factor
FROM benchmark_results
GROUP BY benchmark_name
ORDER BY improvement_factor DESC;
*/

-- ========================================
