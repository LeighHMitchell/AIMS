-- Migration: Add organization classification override fields
-- This allows admin users to manually override the auto-calculated organization classification

DO $$
BEGIN
    -- Add org_classification_override column
    ALTER TABLE organizations 
    ADD COLUMN IF NOT EXISTS org_classification_override BOOLEAN DEFAULT FALSE;

    -- Add org_classification_manual column to store manual classification
    ALTER TABLE organizations 
    ADD COLUMN IF NOT EXISTS org_classification_manual VARCHAR(50);

    -- Add comments to explain the fields
    COMMENT ON COLUMN organizations.org_classification_override IS 'Whether the organization classification is manually overridden by admin';
    COMMENT ON COLUMN organizations.org_classification_manual IS 'Manual organization classification when override is enabled';

    -- Create index on org_classification_override for faster filtering
    CREATE INDEX IF NOT EXISTS idx_organizations_org_classification_override ON organizations(org_classification_override);

    -- Log the changes
    RAISE NOTICE 'Added organization classification override fields';
    
END $$; 