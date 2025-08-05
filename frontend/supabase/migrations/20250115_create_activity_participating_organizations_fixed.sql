-- Create activity_participating_organizations table (Fixed version)
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
CREATE INDEX IF NOT EXISTS idx_activity_participating_orgs_display_order ON activity_participating_organizations(activity_id, display_order);

-- Enable RLS
ALTER TABLE activity_participating_organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Fixed to match current schema)
CREATE POLICY "Users can view participating organizations for activities they can access"
    ON activity_participating_organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = activity_participating_organizations.activity_id
            AND (
                a.created_by = auth.uid()
                OR a.reporting_org_id IN (
                    SELECT organization_id FROM users WHERE id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM activity_contributors ac
                    WHERE ac.activity_id = a.id
                    AND ac.organization_id IN (
                        SELECT organization_id FROM users WHERE id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "Activity creators can manage participating organizations"
    ON activity_participating_organizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = activity_participating_organizations.activity_id
            AND (
                a.created_by = auth.uid()
                OR a.reporting_org_id IN (
                    SELECT organization_id FROM users WHERE id = auth.uid()
                )
            )
        )
    );

-- Create updated_at trigger (only if the function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_activity_participating_organizations_updated_at 
            BEFORE UPDATE ON activity_participating_organizations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;