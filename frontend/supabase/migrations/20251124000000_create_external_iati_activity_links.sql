-- Create external_iati_activity_links table
-- This table tracks when activities are linked to external IATI sources via merge/fork/reference operations
-- Date: 2025-11-24

CREATE TABLE IF NOT EXISTS external_iati_activity_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to local activity
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    
    -- External IATI activity information
    external_iati_identifier TEXT NOT NULL,
    external_reporting_org_ref TEXT,
    external_reporting_org_name TEXT,
    external_activity_title TEXT,
    
    -- Link type and metadata
    link_type TEXT NOT NULL CHECK (link_type IN ('merge', 'fork', 'reference')),
    link_status TEXT DEFAULT 'active' CHECK (link_status IN ('active', 'inactive', 'superseded')),
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional metadata
    notes TEXT,
    import_source TEXT, -- e.g., 'external_publisher_modal', 'bulk_import', etc.
    
    -- Prevent duplicate links
    CONSTRAINT unique_activity_external_iati UNIQUE (activity_id, external_iati_identifier)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_external_iati_links_activity_id 
    ON external_iati_activity_links(activity_id);

CREATE INDEX IF NOT EXISTS idx_external_iati_links_external_iati 
    ON external_iati_activity_links(external_iati_identifier);

CREATE INDEX IF NOT EXISTS idx_external_iati_links_link_type 
    ON external_iati_activity_links(link_type);

CREATE INDEX IF NOT EXISTS idx_external_iati_links_created_at 
    ON external_iati_activity_links(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE external_iati_activity_links IS 
    'Tracks links between local activities and external IATI activities (merges, forks, references)';

COMMENT ON COLUMN external_iati_activity_links.link_type IS 
    'Type of link: merge (linked to prevent duplicates), fork (copied as draft), reference (informational)';

COMMENT ON COLUMN external_iati_activity_links.link_status IS 
    'Status: active (current link), inactive (deactivated), superseded (replaced by another link)';

COMMENT ON COLUMN external_iati_activity_links.external_iati_identifier IS
    'IATI identifier of the external activity (e.g., AU-5-INN068)';

COMMENT ON COLUMN external_iati_activity_links.import_source IS
    'Source of the link creation (e.g., external_publisher_modal, bulk_import)';

-- Enable RLS
ALTER TABLE external_iati_activity_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view external IATI links" 
    ON external_iati_activity_links FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create external IATI links" 
    ON external_iati_activity_links FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own external IATI links" 
    ON external_iati_activity_links FOR UPDATE
    USING (created_by = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_external_iati_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_external_iati_links_updated_at
    BEFORE UPDATE ON external_iati_activity_links
    FOR EACH ROW
    EXECUTE FUNCTION update_external_iati_links_updated_at();







