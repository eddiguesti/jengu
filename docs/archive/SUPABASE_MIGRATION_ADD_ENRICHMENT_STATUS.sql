-- Migration: Add enrichment status tracking to properties table
-- Run this in your Supabase SQL Editor

-- Add enrichmentStatus column (none, pending, completed, failed)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS "enrichmentStatus" VARCHAR(20) DEFAULT 'none';

-- Add enrichedAt timestamp column
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMPTZ;

-- Add enrichmentError column (to store error messages if enrichment fails)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS "enrichmentError" TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_properties_enrichment_status
ON properties ("enrichmentStatus");

-- Update existing rows to have 'none' status
UPDATE properties
SET "enrichmentStatus" = 'none'
WHERE "enrichmentStatus" IS NULL;

COMMENT ON COLUMN properties."enrichmentStatus" IS 'Enrichment status: none, pending, completed, failed';
COMMENT ON COLUMN properties."enrichedAt" IS 'Timestamp when enrichment was completed';
COMMENT ON COLUMN properties."enrichmentError" IS 'Error message if enrichment failed';
