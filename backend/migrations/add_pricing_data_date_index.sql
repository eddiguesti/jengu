-- Migration: Add index on pricing_data.date for faster date-based queries
-- Created: 2025-11-03
-- Purpose: Improve performance of chat endpoint database context queries

-- Add index on date column for faster date-based filtering and ordering
CREATE INDEX IF NOT EXISTS idx_pricing_data_date
ON pricing_data (date DESC);

-- Add composite index on propertyId + date for even faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_pricing_data_property_date
ON pricing_data (propertyId, date DESC);

-- Analyze table to update statistics
ANALYZE pricing_data;

-- Verify indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pricing_data'
ORDER BY indexname;
