-- Add default_custom_year_id column to organizations table
-- Allows each organization to specify which calendar/financial year type they use by default
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS default_custom_year_id UUID REFERENCES custom_years(id) ON DELETE SET NULL;

-- Add an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_organizations_default_custom_year_id ON organizations(default_custom_year_id);
