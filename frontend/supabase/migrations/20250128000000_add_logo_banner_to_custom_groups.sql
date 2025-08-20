-- Create custom_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    description TEXT,
    purpose TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_by_role VARCHAR(50),
    is_public BOOLEAN DEFAULT true,
    tags TEXT[],
    group_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create custom_group_memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES custom_groups(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, organization_id)
);

-- Add logo and banner columns to custom_groups table
ALTER TABLE custom_groups 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS banner TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_groups_is_public ON custom_groups(is_public);
CREATE INDEX IF NOT EXISTS idx_custom_groups_created_by ON custom_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_groups_slug ON custom_groups(slug);
CREATE INDEX IF NOT EXISTS idx_custom_group_memberships_group_id ON custom_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_custom_group_memberships_organization_id ON custom_group_memberships(organization_id);

-- Enable RLS (Row Level Security)
ALTER TABLE custom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_groups
DO $$ 
BEGIN
    -- Only create policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'custom_groups' 
        AND policyname = 'Custom groups are viewable by all authenticated users'
    ) THEN
        CREATE POLICY "Custom groups are viewable by all authenticated users" 
            ON custom_groups FOR SELECT 
            TO authenticated 
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'custom_groups' 
        AND policyname = 'Custom groups can be created by authenticated users'
    ) THEN
        CREATE POLICY "Custom groups can be created by authenticated users" 
            ON custom_groups FOR INSERT 
            TO authenticated 
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'custom_groups' 
        AND policyname = 'Custom groups can be updated by creator'
    ) THEN
        CREATE POLICY "Custom groups can be updated by creator" 
            ON custom_groups FOR UPDATE 
            TO authenticated 
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'custom_groups' 
        AND policyname = 'Custom groups can be deleted by creator'
    ) THEN
        CREATE POLICY "Custom groups can be deleted by creator" 
            ON custom_groups FOR DELETE 
            TO authenticated 
            USING (true);
    END IF;
END $$;

-- RLS Policies for custom_group_memberships
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'custom_group_memberships' 
        AND policyname = 'Group memberships are viewable by all authenticated users'
    ) THEN
        CREATE POLICY "Group memberships are viewable by all authenticated users" 
            ON custom_group_memberships FOR SELECT 
            TO authenticated 
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'custom_group_memberships' 
        AND policyname = 'Group memberships can be managed by authenticated users'
    ) THEN
        CREATE POLICY "Group memberships can be managed by authenticated users" 
            ON custom_group_memberships FOR ALL 
            TO authenticated 
            USING (true);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN custom_groups.logo IS 'URL path to the group logo image';
COMMENT ON COLUMN custom_groups.banner IS 'URL path to the group banner image';
