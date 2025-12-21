-- Migration: Add vocabulary_type to country_sector_vocabularies
-- Allows the same vocabulary management system to handle different types:
-- sectors, finance types, aid types, projects, etc.

-- Add vocabulary_type column with default 'sector' for existing records
ALTER TABLE country_sector_vocabularies
ADD COLUMN IF NOT EXISTS vocabulary_type TEXT DEFAULT 'sector';

-- Add vocabulary_uri column for IATI export (vocab 98/99)
ALTER TABLE country_sector_vocabularies
ADD COLUMN IF NOT EXISTS vocabulary_uri TEXT;

-- Create unique index for default per vocabulary type
-- First drop the old constraint if it exists
DROP INDEX IF EXISTS country_sector_vocabularies_default_idx;

-- Only one default per vocabulary type
CREATE UNIQUE INDEX country_sector_vocabularies_type_default_idx
ON country_sector_vocabularies (vocabulary_type)
WHERE is_default = true;

-- Add index for vocabulary_type lookups
CREATE INDEX IF NOT EXISTS country_sector_vocabularies_type_idx
ON country_sector_vocabularies (vocabulary_type);

-- Add comments
COMMENT ON COLUMN country_sector_vocabularies.vocabulary_type IS
'Type of vocabulary: sector, finance_type, aid_type, flow_type, project, programme, other';

COMMENT ON COLUMN country_sector_vocabularies.vocabulary_uri IS
'URI for the vocabulary when using country-specific codes (vocabulary 98 or 99 in IATI)';

-- Update existing vocabularies to have vocabulary_type='sector'
UPDATE country_sector_vocabularies
SET vocabulary_type = 'sector'
WHERE vocabulary_type IS NULL;
