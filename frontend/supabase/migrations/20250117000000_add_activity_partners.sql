-- Add partner columns to activities table
ALTER TABLE activities
  ADD COLUMN extending_partners JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN implementing_partners JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN government_partners JSONB DEFAULT '[]'::jsonb;

-- Add comments to document the columns
COMMENT ON COLUMN activities.extending_partners IS 'Array of extending partner organizations';
COMMENT ON COLUMN activities.implementing_partners IS 'Array of implementing partner organizations';
COMMENT ON COLUMN activities.government_partners IS 'Array of government partner organizations'; 