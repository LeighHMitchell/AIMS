-- Migration: Add recipient geography columns to activities table
-- Purpose: Store recipient countries, regions, and custom geographies at activity level
-- These columns are used by the Country/Region tab in the activity editor

-- Add recipient_countries column if it doesn't exist
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS recipient_countries JSONB DEFAULT '[]'::jsonb;

-- Add recipient_regions column if it doesn't exist
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS recipient_regions JSONB DEFAULT '[]'::jsonb;

-- Add custom_geographies column if it doesn't exist
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS custom_geographies JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN activities.recipient_countries IS 'Array of recipient countries with percentages: [{id, country: {code, name}, percentage, vocabulary, narrative}]';
COMMENT ON COLUMN activities.recipient_regions IS 'Array of recipient regions with percentages: [{id, region: {code, name}, percentage, vocabulary, narrative}]';
COMMENT ON COLUMN activities.custom_geographies IS 'Array of custom geographies (vocabulary 99): [{id, name, code, percentage, vocabularyUri, narrative}]';

-- Add GIN indexes for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_activities_recipient_countries_gin ON activities USING GIN (recipient_countries);
CREATE INDEX IF NOT EXISTS idx_activities_recipient_regions_gin ON activities USING GIN (recipient_regions);
CREATE INDEX IF NOT EXISTS idx_activities_custom_geographies_gin ON activities USING GIN (custom_geographies);

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added recipient_countries, recipient_regions, and custom_geographies columns to activities table';
END $$;
