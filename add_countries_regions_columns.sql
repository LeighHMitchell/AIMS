-- Add countries and regions columns to activities table
-- These will store JSON data for country and region allocations

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS recipient_countries JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recipient_regions JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_recipient_countries ON activities USING GIN (recipient_countries);
CREATE INDEX IF NOT EXISTS idx_activities_recipient_regions ON activities USING GIN (recipient_regions);

-- Add comments to document the columns
COMMENT ON COLUMN activities.recipient_countries IS 'JSON array of country allocations with percentage values';
COMMENT ON COLUMN activities.recipient_regions IS 'JSON array of region allocations with percentage values';Whe

