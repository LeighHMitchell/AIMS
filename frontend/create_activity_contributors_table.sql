-- Create activity_contributors table for persisting nominated contributors
-- This table stores the relationship between activities and their contributors

-- Create the activity_contributors table
CREATE TABLE IF NOT EXISTS activity_contributors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    organization_name TEXT NOT NULL, -- Denormalized for performance
    status TEXT NOT NULL DEFAULT 'nominated' CHECK (status IN ('nominated', 'accepted', 'declined')),
    role TEXT NOT NULL DEFAULT 'contributor',
    nominated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    nominated_by_name TEXT, -- Denormalized for performance
    nominated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    can_edit_own_data BOOLEAN NOT NULL DEFAULT true,
    can_view_other_drafts BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique contributor per activity
    UNIQUE(activity_id, organization_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_contributors_activity_id ON activity_contributors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_organization_id ON activity_contributors(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_status ON activity_contributors(status);
CREATE INDEX IF NOT EXISTS idx_activity_contributors_nominated_by ON activity_contributors(nominated_by);

-- Create function to automatically update updated_at
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