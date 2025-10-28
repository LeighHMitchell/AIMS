-- Add organization alias fields for IATI import resolution
-- Migration: Add alias support to organizations table
-- Date: 2025-02-01

-- Add alias fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS alias_refs TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS name_aliases TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN organizations.alias_refs IS 'Legacy or internal organization codes used for matching during IATI import (e.g., 010712, KR-GOV-OLD)';
COMMENT ON COLUMN organizations.name_aliases IS 'Alternate organization names used for matching during IATI import (e.g., KOICA, Korea Intern. Cooperation Agency)';

-- Create GIN indexes for fast array lookups
CREATE INDEX IF NOT EXISTS idx_org_alias_refs ON organizations USING gin (alias_refs);
CREATE INDEX IF NOT EXISTS idx_org_name_aliases ON organizations USING gin (name_aliases);

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on organization name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_org_name_trgm ON organizations USING gin (name gin_trgm_ops);

-- Add index on iati_org_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_iati_org_id ON organizations (iati_org_id) WHERE iati_org_id IS NOT NULL;

