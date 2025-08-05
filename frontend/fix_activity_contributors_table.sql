-- Fix activity_contributors table to ensure all columns exist
-- This script handles both creating new table and updating existing ones

-- First, create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_contributors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    organization_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'nominated',
    role TEXT NOT NULL DEFAULT 'contributor',
    nominated_by UUID,
    nominated_by_name TEXT,
    nominated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    can_edit_own_data BOOLEAN NOT NULL DEFAULT true,
    can_view_other_drafts BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add nominated_by_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contributors' 
                   AND column_name = 'nominated_by_name') THEN
        ALTER TABLE activity_contributors ADD COLUMN nominated_by_name TEXT;
    END IF;
    
    -- Add organization_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contributors' 
                   AND column_name = 'organization_name') THEN
        ALTER TABLE activity_contributors ADD COLUMN organization_name TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Add other potentially missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contributors' 
                   AND column_name = 'can_edit_own_data') THEN
        ALTER TABLE activity_contributors ADD COLUMN can_edit_own_data BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contributors' 
                   AND column_name = 'can_view_other_drafts') THEN
        ALTER TABLE activity_contributors ADD COLUMN can_view_other_drafts BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contributors' 
                   AND column_name = 'responded_at') THEN
        ALTER TABLE activity_contributors ADD COLUMN responded_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'activity_contributors' 
                   AND constraint_name = 'activity_contributors_activity_id_fkey') THEN
        ALTER TABLE activity_contributors 
        ADD CONSTRAINT activity_contributors_activity_id_fkey 
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'activity_contributors' 
                   AND constraint_name = 'activity_contributors_organization_id_fkey') THEN
        ALTER TABLE activity_contributors 
        ADD CONSTRAINT activity_contributors_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'activity_contributors' 
                   AND constraint_name = 'activity_contributors_activity_id_organization_id_key') THEN
        ALTER TABLE activity_contributors 
        ADD CONSTRAINT activity_contributors_activity_id_organization_id_key 
        UNIQUE(activity_id, organization_id);
    END IF;
    
    -- Add status check constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'activity_contributors' 
                   AND constraint_name = 'activity_contributors_status_check') THEN
        ALTER TABLE activity_contributors 
        ADD CONSTRAINT activity_contributors_status_check 
        CHECK (status IN ('nominated', 'accepted', 'declined'));
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_activity_contributors_activity_id ON activity_contributors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_organization_id ON activity_contributors(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_status ON activity_contributors(status);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_nominated_by ON activity_contributors(nominated_by);

-- Create function to automatically update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_activity_contributors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_activity_contributors_updated_at_trigger ON activity_contributors;
CREATE TRIGGER update_activity_contributors_updated_at_trigger
    BEFORE UPDATE ON activity_contributors
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_contributors_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE activity_contributors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view activity contributors" ON activity_contributors;
DROP POLICY IF EXISTS "Users can nominate contributors" ON activity_contributors;
DROP POLICY IF EXISTS "Users can update contributors" ON activity_contributors;
DROP POLICY IF EXISTS "Users can remove contributors" ON activity_contributors;

-- Create RLS policies
-- Policy 1: Users can view contributors for activities they can access
CREATE POLICY "Users can view activity contributors" ON activity_contributors
    FOR SELECT USING (
        activity_id IN (
            SELECT a.id FROM activities a
            LEFT JOIN user_organizations uo ON uo.organization_id = a.reporting_org_id
            WHERE uo.user_id = auth.uid()
            OR a.reporting_org_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

-- Policy 2: Users can insert contributors for activities they can edit
CREATE POLICY "Users can nominate contributors" ON activity_contributors
    FOR INSERT WITH CHECK (
        activity_id IN (
            SELECT a.id FROM activities a
            LEFT JOIN user_organizations uo ON uo.organization_id = a.reporting_org_id
            WHERE uo.user_id = auth.uid()
            OR a.reporting_org_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

-- Policy 3: Users can update contributors for activities they can edit OR their own nominations
CREATE POLICY "Users can update contributors" ON activity_contributors
    FOR UPDATE USING (
        activity_id IN (
            SELECT a.id FROM activities a
            LEFT JOIN user_organizations uo ON uo.organization_id = a.reporting_org_id
            WHERE uo.user_id = auth.uid()
            OR a.reporting_org_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
        OR organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Policy 4: Users can delete contributors for activities they can edit
CREATE POLICY "Users can remove contributors" ON activity_contributors
    FOR DELETE USING (
        activity_id IN (
            SELECT a.id FROM activities a
            LEFT JOIN user_organizations uo ON uo.organization_id = a.reporting_org_id
            WHERE uo.user_id = auth.uid()
            OR a.reporting_org_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'activity_contributors' 
ORDER BY ordinal_position;