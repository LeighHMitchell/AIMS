-- Create activity_participating_organizations table
-- Run this directly in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS activity_participating_organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('extending', 'implementing', 'government')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique activity-organization-role combinations
    UNIQUE(activity_id, organization_id, role_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_participating_orgs_activity_id ON activity_participating_organizations(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_participating_orgs_organization_id ON activity_participating_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_participating_orgs_role_type ON activity_participating_organizations(role_type);

-- Enable Row Level Security
ALTER TABLE activity_participating_organizations ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_participating_organizations
CREATE POLICY "Allow authenticated users to view participating organizations" ON activity_participating_organizations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow activity owners to manage participating organizations" ON activity_participating_organizations
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM activities a 
            WHERE a.id = activity_participating_organizations.activity_id 
            AND a.reporting_org_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_activity_participating_orgs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_participating_orgs_updated_at
    BEFORE UPDATE ON activity_participating_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_participating_orgs_updated_at();Could not find the 'nominated_by_name' column of 'activity_contributors' in the schema cache