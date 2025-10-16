-- Add enrichment tracking columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS enrichmentStatus TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS enrichedAt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrichmentError TEXT;

-- Add comment for documentation
COMMENT ON COLUMN properties.enrichmentStatus IS 'Status of data enrichment: none, pending, completed, failed';
COMMENT ON COLUMN properties.enrichedAt IS 'Timestamp when enrichment was completed';
COMMENT ON COLUMN properties.enrichmentError IS 'Error message if enrichment failed';
