-- ========================================
-- PRICING DATA PARTITIONING MIGRATION
-- ========================================
-- This migration converts the pricing_data table to use monthly range partitioning
-- for improved query performance and data management at scale.
--
-- **IMPORTANT**: Run this during low-traffic hours (recommended: 2-4 AM)
-- **ESTIMATED DOWNTIME**: 5-15 minutes depending on data volume
-- **BACKUP**: Take a full database backup before proceeding
--
-- Prerequisites:
--   - PostgreSQL 10+ (for native partitioning)
--   - Database backup completed
--   - Read replica configured (optional, for zero-downtime)
--
-- Author: Engineering Team
-- Date: 2025-10-23
-- ========================================

-- ========================================
-- STEP 1: PRE-MIGRATION CHECKS
-- ========================================

-- Check current table size
SELECT
  pg_size_pretty(pg_total_relation_size('pricing_data')) as total_size,
  count(*) as row_count,
  min(date) as earliest_date,
  max(date) as latest_date
FROM pricing_data;

-- Check for NULL dates (must be handled before partitioning)
SELECT count(*) as null_date_count
FROM pricing_data
WHERE date IS NULL;

-- If null_date_count > 0, fix with:
-- UPDATE pricing_data SET date = created_at::date WHERE date IS NULL;

-- ========================================
-- STEP 2: CREATE PARTITIONED TABLE
-- ========================================

-- Rename existing table
ALTER TABLE pricing_data RENAME TO pricing_data_old;

-- Create new partitioned table with same structure
CREATE TABLE pricing_data (
  id UUID DEFAULT gen_random_uuid(),
  "propertyId" TEXT NOT NULL,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  occupancy NUMERIC,
  bookings INT,
  -- Enriched fields
  temperature NUMERIC,
  precipitation NUMERIC,
  "weatherCondition" TEXT,
  "sunshineHours" NUMERIC,
  "dayOfWeek" INT,
  month INT,
  season TEXT,
  "isWeekend" BOOLEAN,
  "isHoliday" BOOLEAN,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "userId" UUID,
  -- Partition key constraint
  PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

-- Add foreign key constraints (without partition key in PK, we need to defer these)
-- Note: Foreign keys work differently with partitioned tables

-- ========================================
-- STEP 3: CREATE PARTITIONS
-- ========================================
-- Create partitions for historical data + 12 months future
-- Adjust date ranges based on your data

-- Historical partitions (example: 2023-2025)
CREATE TABLE pricing_data_2023_01 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
CREATE TABLE pricing_data_2023_02 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
CREATE TABLE pricing_data_2023_03 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
CREATE TABLE pricing_data_2023_04 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
CREATE TABLE pricing_data_2023_05 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
CREATE TABLE pricing_data_2023_06 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
CREATE TABLE pricing_data_2023_07 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
CREATE TABLE pricing_data_2023_08 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
CREATE TABLE pricing_data_2023_09 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
CREATE TABLE pricing_data_2023_10 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
CREATE TABLE pricing_data_2023_11 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
CREATE TABLE pricing_data_2023_12 PARTITION OF pricing_data
  FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');

CREATE TABLE pricing_data_2024_01 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE pricing_data_2024_02 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE pricing_data_2024_03 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE pricing_data_2024_04 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE pricing_data_2024_05 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE pricing_data_2024_06 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE pricing_data_2024_07 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE pricing_data_2024_08 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE pricing_data_2024_09 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE pricing_data_2024_10 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE pricing_data_2024_11 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE pricing_data_2024_12 PARTITION OF pricing_data
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE pricing_data_2025_01 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE pricing_data_2025_02 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE pricing_data_2025_03 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE pricing_data_2025_04 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE pricing_data_2025_05 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE pricing_data_2025_06 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE pricing_data_2025_07 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE pricing_data_2025_08 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE pricing_data_2025_09 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE pricing_data_2025_10 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE pricing_data_2025_11 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE pricing_data_2025_12 PARTITION OF pricing_data
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Future partitions (2026)
CREATE TABLE pricing_data_2026_01 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE pricing_data_2026_02 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE pricing_data_2026_03 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE pricing_data_2026_04 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE pricing_data_2026_05 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE pricing_data_2026_06 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE pricing_data_2026_07 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE pricing_data_2026_08 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE pricing_data_2026_09 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE pricing_data_2026_10 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE pricing_data_2026_11 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE pricing_data_2026_12 PARTITION OF pricing_data
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- ========================================
-- STEP 4: CREATE INDEXES ON PARTITIONED TABLE
-- ========================================

-- Composite index for property + date queries (most common pattern)
CREATE INDEX idx_pricing_data_property_date ON pricing_data ("propertyId", date);

-- Composite index for user + date queries (analytics)
CREATE INDEX idx_pricing_data_user_date ON pricing_data ("userId", date);

-- Index for date-only queries (time-range filtering)
CREATE INDEX idx_pricing_data_date ON pricing_data (date);

-- Index for property queries
CREATE INDEX idx_pricing_data_property ON pricing_data ("propertyId");

-- Index for user queries (analytics, reporting)
CREATE INDEX idx_pricing_data_user ON pricing_data ("userId");

-- Partial index for weekend data (if frequently queried)
CREATE INDEX idx_pricing_data_weekends ON pricing_data (date, "propertyId")
  WHERE "isWeekend" = true;

-- Partial index for holiday data
CREATE INDEX idx_pricing_data_holidays ON pricing_data (date, "propertyId")
  WHERE "isHoliday" = true;

-- Index for temporal analysis (month, season)
CREATE INDEX idx_pricing_data_temporal ON pricing_data (month, season, "dayOfWeek");

-- ========================================
-- STEP 5: MIGRATE DATA
-- ========================================

-- Copy data from old table to new partitioned table
-- This will automatically route to correct partitions
INSERT INTO pricing_data
SELECT * FROM pricing_data_old;

-- Verify row counts match
SELECT
  (SELECT count(*) FROM pricing_data) as new_count,
  (SELECT count(*) FROM pricing_data_old) as old_count,
  (SELECT count(*) FROM pricing_data) = (SELECT count(*) FROM pricing_data_old) as counts_match;

-- ========================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE pricing_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (inherit from old table or create new)
CREATE POLICY "select_own_pricing_data" ON pricing_data
  FOR SELECT USING (auth.uid() = "userId"::uuid);

CREATE POLICY "insert_own_pricing_data" ON pricing_data
  FOR INSERT WITH CHECK (auth.uid() = "userId"::uuid);

CREATE POLICY "update_own_pricing_data" ON pricing_data
  FOR UPDATE USING (auth.uid() = "userId"::uuid);

CREATE POLICY "delete_own_pricing_data" ON pricing_data
  FOR DELETE USING (auth.uid() = "userId"::uuid);

-- ========================================
-- STEP 7: UPDATE FOREIGN KEY REFERENCES
-- ========================================

-- Note: Other tables referencing pricing_data may need updates
-- Example: If pricing_quotes references pricing_data

-- Check for dependent tables:
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'pricing_data_old';

-- Update foreign keys as needed (manual step based on output above)

-- ========================================
-- STEP 8: DROP OLD TABLE (AFTER VERIFICATION)
-- ========================================

-- **WAIT**: Verify application works with new table for 24-48 hours
-- **BACKUP**: Ensure backup includes both old and new tables

-- When ready to clean up:
-- DROP TABLE pricing_data_old;

-- For now, rename it as backup
ALTER TABLE pricing_data_old RENAME TO pricing_data_backup;

-- ========================================
-- STEP 9: ADD TABLE COMMENTS
-- ========================================

COMMENT ON TABLE pricing_data IS 'Time-series pricing data with monthly range partitioning for improved query performance';
COMMENT ON COLUMN pricing_data.date IS 'Partition key - booking date';
COMMENT ON COLUMN pricing_data."propertyId" IS 'Property identifier';
COMMENT ON COLUMN pricing_data.price IS 'Price per night';
COMMENT ON COLUMN pricing_data.occupancy IS 'Occupancy rate (0.0 to 1.0)';

-- ========================================
-- STEP 10: VACUUM AND ANALYZE
-- ========================================

VACUUM ANALYZE pricing_data;

-- ========================================
-- POST-MIGRATION VERIFICATION
-- ========================================

-- 1. Check partition structure
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE 'pricing_data%'
ORDER BY tablename;

-- 2. Verify data distribution across partitions
SELECT
  tableoid::regclass as partition_name,
  count(*) as row_count,
  min(date) as min_date,
  max(date) as max_date,
  pg_size_pretty(pg_total_relation_size(tableoid)) as partition_size
FROM pricing_data
GROUP BY tableoid
ORDER BY partition_name;

-- 3. Test query performance (before/after comparison)
EXPLAIN ANALYZE
SELECT * FROM pricing_data
WHERE "propertyId" = 'test-property-123'
  AND date BETWEEN '2025-01-01' AND '2025-01-31';

-- 4. Check indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename LIKE 'pricing_data%'
ORDER BY tablename, indexname;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Checklist:
--   ✓ Data migrated successfully
--   ✓ Row counts match
--   ✓ Indexes created
--   ✓ RLS policies enabled
--   ✓ Vacuum/analyze completed
--   ✓ Query performance verified
--   □ Application tested with new table
--   □ Monitoring alerts configured
--   □ Old table dropped (after 48hr verification)
--
-- Next steps:
--   1. Monitor application logs for errors
--   2. Check Grafana for query latency improvements
--   3. Set up automated partition creation (see maintenance script)
--   4. Configure retention policy for old partitions
-- ========================================
