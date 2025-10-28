-- Create audit trail table for organization alias resolution
-- Migration: Track how organizations are resolved during IATI imports
-- Date: 2025-02-01

-- Create organization_alias_mappings table
CREATE TABLE IF NOT EXISTS organization_alias_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Original data from IATI XML
    original_ref TEXT,
    original_narrative TEXT,
    
    -- Resolution details
    resolved_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    resolution_method TEXT NOT NULL CHECK (resolution_method IN ('direct', 'alias_ref', 'fuzzy_name', 'fuzzy_alias', 'manual')),
    matched_by TEXT, -- Which specific alias or field caused the match
    similarity_score DECIMAL(3,2), -- For fuzzy matches (0.00 to 1.00)
    
    -- Import context
    import_session_id TEXT, -- Groups all resolutions from one import
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    notes TEXT -- Optional notes about why this resolution was made
);

-- Add comments for documentation
COMMENT ON TABLE organization_alias_mappings IS 'Audit trail of organization reference resolutions during IATI imports';
COMMENT ON COLUMN organization_alias_mappings.original_ref IS 'The organization @ref attribute from IATI XML';
COMMENT ON COLUMN organization_alias_mappings.original_narrative IS 'The organization name/narrative from IATI XML';
COMMENT ON COLUMN organization_alias_mappings.resolution_method IS 'How the organization was matched: direct (iati_org_id), alias_ref, fuzzy_name, fuzzy_alias, or manual';
COMMENT ON COLUMN organization_alias_mappings.matched_by IS 'The specific field/alias that caused the match';
COMMENT ON COLUMN organization_alias_mappings.import_session_id IS 'Groups all resolutions from a single import session';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_alias_mappings_original_ref ON organization_alias_mappings (original_ref) WHERE original_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alias_mappings_org_id ON organization_alias_mappings (resolved_organization_id);
CREATE INDEX IF NOT EXISTS idx_alias_mappings_session ON organization_alias_mappings (import_session_id) WHERE import_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alias_mappings_created_at ON organization_alias_mappings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alias_mappings_method ON organization_alias_mappings (resolution_method);

-- Enable RLS
ALTER TABLE organization_alias_mappings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated users to read alias mappings" ON organization_alias_mappings;
DROP POLICY IF EXISTS "Allow authenticated users to create alias mappings" ON organization_alias_mappings;
DROP POLICY IF EXISTS "Allow users to update their own mappings" ON organization_alias_mappings;
DROP POLICY IF EXISTS "Allow users to delete their own mappings" ON organization_alias_mappings;

-- RLS Policies
-- Allow authenticated users to read all mappings
CREATE POLICY "Allow authenticated users to read alias mappings"
    ON organization_alias_mappings FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert mappings
CREATE POLICY "Allow authenticated users to create alias mappings"
    ON organization_alias_mappings FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Only allow users to update their own mappings or admins
CREATE POLICY "Allow users to update their own mappings"
    ON organization_alias_mappings FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

-- Only allow users to delete their own mappings or admins
CREATE POLICY "Allow users to delete their own mappings"
    ON organization_alias_mappings FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

