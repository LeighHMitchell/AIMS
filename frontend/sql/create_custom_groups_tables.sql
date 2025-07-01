-- Custom Groups Schema for AIMS
-- This creates tables for custom groupings of organizations (e.g., "Humanitarian Donor Consortium")

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS custom_group_memberships CASCADE;
DROP TABLE IF EXISTS custom_groups CASCADE;

-- Create custom groups table
CREATE TABLE custom_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    description TEXT,
    purpose TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_by_role VARCHAR(50),
    is_public BOOLEAN DEFAULT true,
    tags TEXT[], -- Array of optional tags/themes
    group_code VARCHAR(50) UNIQUE, -- Internal code/identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create custom group memberships table
CREATE TABLE custom_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES custom_groups(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, organization_id)
);

-- Create indexes for performance
CREATE INDEX idx_custom_groups_is_public ON custom_groups(is_public);
CREATE INDEX idx_custom_groups_created_by ON custom_groups(created_by);
CREATE INDEX idx_custom_groups_slug ON custom_groups(slug);
CREATE INDEX idx_custom_group_memberships_group_id ON custom_group_memberships(group_id);
CREATE INDEX idx_custom_group_memberships_organization_id ON custom_group_memberships(organization_id);

-- Create a view for custom groups with member count
CREATE OR REPLACE VIEW custom_groups_with_stats AS
SELECT 
    cg.*,
    COUNT(DISTINCT cgm.organization_id) as member_count,
    ARRAY_AGG(
        jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'acronym', o.acronym
        ) ORDER BY o.name
    ) FILTER (WHERE o.id IS NOT NULL) as members
FROM custom_groups cg
LEFT JOIN custom_group_memberships cgm ON cg.id = cgm.group_id
LEFT JOIN organizations o ON cgm.organization_id = o.id
GROUP BY cg.id;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_custom_group_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
        -- Remove leading/trailing hyphens
        NEW.slug = trim(both '-' from NEW.slug);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug
CREATE TRIGGER custom_groups_generate_slug
BEFORE INSERT OR UPDATE ON custom_groups
FOR EACH ROW
EXECUTE FUNCTION generate_custom_group_slug();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for updated_at
CREATE TRIGGER update_custom_groups_updated_at
BEFORE UPDATE ON custom_groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust based on your Supabase setup)
GRANT SELECT ON custom_groups TO authenticated;
GRANT SELECT ON custom_group_memberships TO authenticated;
GRANT SELECT ON custom_groups_with_stats TO authenticated;

-- RLS (Row Level Security) policies
ALTER TABLE custom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_group_memberships ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view public groups
CREATE POLICY "Public groups are viewable by everyone" ON custom_groups
    FOR SELECT USING (is_public = true);

-- Policy: Authenticated users can view their own private groups
CREATE POLICY "Users can view their own private groups" ON custom_groups
    FOR SELECT USING (auth.uid() = created_by AND is_public = false);

-- Policy: Superusers and org managers can create groups
CREATE POLICY "Authorized users can create groups" ON custom_groups
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('super_user', 'org_manager')
        )
    );

-- Policy: Users can update their own groups, superusers can update any
CREATE POLICY "Users can update their own groups" ON custom_groups
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'super_user'
        )
    );

-- Policy: Users can delete their own groups, superusers can delete any
CREATE POLICY "Users can delete their own groups" ON custom_groups
    FOR DELETE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'super_user'
        )
    );

-- Memberships policies
CREATE POLICY "View memberships of viewable groups" ON custom_group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM custom_groups cg
            WHERE cg.id = group_id
            AND (cg.is_public = true OR cg.created_by = auth.uid())
        )
    );

CREATE POLICY "Manage memberships of owned groups" ON custom_group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM custom_groups cg
            WHERE cg.id = group_id
            AND (
                cg.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND raw_user_meta_data->>'role' = 'super_user'
                )
            )
        )
    );

-- Sample data (optional - remove in production)
INSERT INTO custom_groups (name, description, purpose, group_code, tags, created_by_name, created_by_role) VALUES
('Humanitarian Donor Consortium', 'Coalition of donors focused on humanitarian response', 'Coordinate humanitarian funding and ensure rapid response to emergencies', 'HDC-2024', ARRAY['humanitarian', 'emergency', 'coordination'], 'System Admin', 'super_user'),
('Myanmar Core Group', 'Key development partners working on sustainable development', 'Align development strategies and share best practices', 'MCG-2024', ARRAY['development', 'coordination', 'strategy'], 'System Admin', 'super_user'),
('Asia Pacific Feminist Funders', 'Network of funders supporting gender equality initiatives', 'Advance womens rights and gender equality through coordinated funding', 'APFF-2024', ARRAY['gender', 'womens-rights', 'asia-pacific'], 'System Admin', 'super_user');

ALTER TYPE transaction_type_enum ADD VALUE '1';  -- Incoming
ALTER TYPE transaction_type_enum ADD VALUE '2';  -- Commitment
ALTER TYPE transaction_type_enum ADD VALUE '3';  -- Disbursement
-- etc. 