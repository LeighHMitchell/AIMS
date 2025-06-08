-- Create user_organizations table for many-to-many relationship between users and organizations
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user-organization pairs
    UNIQUE(user_id, organization_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_role ON user_organizations(role);

-- Enable RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organization memberships" ON user_organizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view all memberships" ON user_organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo 
            WHERE uo.organization_id = user_organizations.organization_id 
            AND uo.user_id = auth.uid() 
            AND uo.role = 'admin'
        )
    );

CREATE POLICY "Super users can view all memberships" ON user_organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_user'
        )
    );

-- Insert policies for organization admins and super users
CREATE POLICY "Organization admins can manage memberships" ON user_organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo 
            WHERE uo.organization_id = user_organizations.organization_id 
            AND uo.user_id = auth.uid() 
            AND uo.role = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_user'
        )
    );

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_user_organizations_updated_at
    BEFORE UPDATE ON user_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_organizations_updated_at();

-- Add some sample data if organizations exist
DO $$
BEGIN
    -- Only insert if we have organizations and users
    IF EXISTS (SELECT 1 FROM organizations LIMIT 1) AND EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        -- Insert sample user-organization relationships
        INSERT INTO user_organizations (user_id, organization_id, role)
        SELECT 
            u.id as user_id,
            o.id as organization_id,
            'admin' as role
        FROM auth.users u
        CROSS JOIN organizations o
        WHERE u.email = 'john@example.com'  -- Assuming this is your test user
        LIMIT 3  -- Limit to first 3 organizations
        ON CONFLICT (user_id, organization_id) DO NOTHING;
    END IF;
END $$; 