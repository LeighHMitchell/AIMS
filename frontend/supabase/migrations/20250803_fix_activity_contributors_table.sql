-- Fix activity_contributors table for proper saving and user attribution
-- This migration ensures the table exists with all necessary columns and proper RLS policies

-- Create activity_contributors table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_contributors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'nominated' CHECK (status IN ('nominated', 'accepted', 'declined', 'requested')),
    nominated_by UUID REFERENCES users(id),
    nominated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    can_edit_own_data BOOLEAN DEFAULT true,
    can_view_other_drafts BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, organization_id)
);

-- Add role and display_order columns if they don't exist
ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'contributor' CHECK (role IN ('funder', 'implementer', 'coordinator', 'contributor', 'partner'));

ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_contributors_activity_id ON activity_contributors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_organization_id ON activity_contributors(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_status ON activity_contributors(status);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_nominated_by ON activity_contributors(nominated_by);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_role ON activity_contributors(role);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_display_order ON activity_contributors(activity_id, display_order);

-- Enable RLS
ALTER TABLE activity_contributors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with correct references
DROP POLICY IF EXISTS "Activity contributors are viewable by everyone" ON activity_contributors;
DROP POLICY IF EXISTS "Activity creators can manage contributors" ON activity_contributors;
DROP POLICY IF EXISTS "Organizations can respond to their nominations" ON activity_contributors;
DROP POLICY IF EXISTS "Service role can manage all contributors" ON activity_contributors;

-- Policy to allow anyone to read contributors
CREATE POLICY "Activity contributors are viewable by everyone"
    ON activity_contributors FOR SELECT
    USING (true);

-- Policy to allow activity creators to manage contributors
-- Updated to use correct column names and be more permissive
CREATE POLICY "Activity creators can manage contributors"
    ON activity_contributors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = activity_contributors.activity_id
            AND (
                a.created_by = auth.uid()
                OR a.reporting_org_id IN (
                    SELECT organization_id FROM users WHERE id = auth.uid()
                )
                OR auth.uid() IS NOT NULL -- Allow authenticated users to nominate
            )
        )
    );

-- Policy to allow organizations to respond to their own nominations
CREATE POLICY "Organizations can respond to their nominations"
    ON activity_contributors FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND status = 'nominated'
    );

-- Policy for service role to manage all contributors (for API operations)
CREATE POLICY "Service role can manage all contributors"
    ON activity_contributors FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR current_setting('role') = 'service_role'
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_activity_contributors_updated_at ON activity_contributors;
CREATE TRIGGER update_activity_contributors_updated_at
    BEFORE UPDATE ON activity_contributors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE activity_contributors IS 'Organizations that contribute to activities with their roles and permissions';
COMMENT ON COLUMN activity_contributors.role IS 'Role of the organization in the activity: funder, implementer, coordinator, contributor, partner';
COMMENT ON COLUMN activity_contributors.display_order IS 'Order in which contributors should be displayed in UI (0 = highest priority)';
COMMENT ON COLUMN activity_contributors.nominated_by IS 'User who nominated this organization as a contributor';
COMMENT ON COLUMN activity_contributors.status IS 'Current status of the contributor nomination';