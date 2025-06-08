-- Create all missing tables for AIMS Partner Summary
-- Copy and paste this entire script into your Supabase SQL Editor

-- 1. Organization Types Table (IATI DAC codes)
CREATE TABLE IF NOT EXISTS organization_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organization Groups Table (User-defined groups)
CREATE TABLE IF NOT EXISTS organization_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Organization Group Members Junction Table
CREATE TABLE IF NOT EXISTS organization_group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES organization_groups(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, group_id)
);

-- 4. Insert IATI DAC Organization Types
INSERT INTO organization_types (code, label, description, category, sort_order) VALUES
('10', 'Government', 'Government agencies and departments', 'government', 1),
('11', 'Local Government', 'Regional, state, and local government entities', 'government', 2),
('21', 'International NGO', 'International non-governmental organizations', 'ngo', 4),
('22', 'National NGO', 'National non-governmental organizations', 'ngo', 5),
('40', 'Multilateral', 'Multilateral organizations', 'multilateral', 8),
('70', 'Private Sector', 'Private sector organizations', 'private', 10),
('90', 'Other', 'Other types of organizations', 'other', 12)
ON CONFLICT (code) DO NOTHING;

-- 5. Insert Default User Groups
INSERT INTO organization_groups (name, description) VALUES
('UN Agencies', 'United Nations system organizations'),
('Nordic Donors', 'Nordic development cooperation agencies'),
('EU Partners', 'European Union and related institutions'),
('Private Sector Partners', 'Private companies and foundations')
ON CONFLICT DO NOTHING;

-- 6. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_organization_types_code ON organization_types(code);
CREATE INDEX IF NOT EXISTS idx_org_group_members_org ON organization_group_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_group_members_group ON organization_group_members(group_id);

-- 7. Success Message
SELECT 'AIMS Partner Summary tables created successfully!' as result; 