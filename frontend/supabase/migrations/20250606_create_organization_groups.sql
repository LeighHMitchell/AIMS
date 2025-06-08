-- Create organization_groups table for user-defined groupings
CREATE TABLE IF NOT EXISTS organization_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique group names
    UNIQUE(name)
);

-- Create organization_group_members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS organization_group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES organization_groups(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique organization-group pairs
    UNIQUE(group_id, organization_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_groups_created_by ON organization_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_groups_name ON organization_groups(name);
CREATE INDEX IF NOT EXISTS idx_organization_group_members_group_id ON organization_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_organization_group_members_organization_id ON organization_group_members(organization_id);

-- Enable RLS
ALTER TABLE organization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_groups
CREATE POLICY "Anyone can view organization groups" ON organization_groups
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create organization groups" ON organization_groups
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Group creators can update their groups" ON organization_groups
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Group creators can delete their groups" ON organization_groups
    FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "Super users can manage all groups" ON organization_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_user'
        )
    );

-- RLS Policies for organization_group_members
CREATE POLICY "Anyone can view organization group members" ON organization_group_members
    FOR SELECT USING (true);

CREATE POLICY "Group creators can manage group members" ON organization_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_groups og 
            WHERE og.id = organization_group_members.group_id 
            AND og.created_by = auth.uid()
        )
    );

CREATE POLICY "Super users can manage all group members" ON organization_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_user'
        )
    );

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_organization_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organization_groups 
    SET last_updated = NOW() 
    WHERE id = COALESCE(NEW.group_id, OLD.group_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger to update group timestamp when members change
CREATE TRIGGER organization_group_members_timestamp_trigger
    AFTER INSERT OR UPDATE OR DELETE ON organization_group_members
    FOR EACH ROW EXECUTE FUNCTION update_organization_group_timestamp();

-- Apply updated_at trigger to organization_groups
CREATE TRIGGER update_organization_groups_updated_at 
    BEFORE UPDATE ON organization_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample organization groups
INSERT INTO organization_groups (name, description, created_by) VALUES 
('Nordic Donors', 'Nordic development cooperation agencies', (SELECT id FROM users WHERE role = 'super_user' LIMIT 1)),
('UN Agencies', 'United Nations system organizations', (SELECT id FROM users WHERE role = 'super_user' LIMIT 1)),
('EU Delegation Partners', 'European Union and member state partners', (SELECT id FROM users WHERE role = 'super_user' LIMIT 1)),
('Fragile State Working Group', 'Organizations working in fragile and conflict-affected states', (SELECT id FROM users WHERE role = 'super_user' LIMIT 1)),
('Private Sector Partners', 'Commercial and private foundation partners', (SELECT id FROM users WHERE role = 'super_user' LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- Add some sample group memberships (adjust organization IDs as needed)
INSERT INTO organization_group_members (group_id, organization_id) 
SELECT 
    og.id,
    o.id
FROM organization_groups og
CROSS JOIN organizations o
WHERE 
    (og.name = 'UN Agencies' AND o.organization_type = 'development_partner' AND (o.name ILIKE '%UN%' OR o.name ILIKE '%UNDP%'))
    OR (og.name = 'Private Sector Partners' AND o.organization_type IN ('31', '60', 'private_sector'))
    OR (og.name = 'Nordic Donors' AND o.name IN ('CIDA', 'DFAT')) -- Adjust based on actual data
ON CONFLICT (group_id, organization_id) DO NOTHING; 