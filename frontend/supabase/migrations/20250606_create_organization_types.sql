-- Create organization_types table for UUID-backed organization type groupings
CREATE TABLE IF NOT EXISTS organization_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'government', 'multilateral', 'ngo', etc.
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique codes and labels
    CONSTRAINT unique_org_type_code UNIQUE(code),
    CONSTRAINT unique_org_type_label UNIQUE(label)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_types_code ON organization_types(code);
CREATE INDEX IF NOT EXISTS idx_organization_types_category ON organization_types(category);
CREATE INDEX IF NOT EXISTS idx_organization_types_active ON organization_types(is_active);
CREATE INDEX IF NOT EXISTS idx_organization_types_sort_order ON organization_types(sort_order);

-- Enable RLS
ALTER TABLE organization_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_types
CREATE POLICY "Anyone can view organization types" ON organization_types
    FOR SELECT USING (true);

CREATE POLICY "Super users can manage organization types" ON organization_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_user'
        )
    );

-- Create updated_at trigger
CREATE TRIGGER update_organization_types_updated_at 
    BEFORE UPDATE ON organization_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert IATI DAC Organization Types with proper UUIDs
INSERT INTO organization_types (code, label, description, category, sort_order) VALUES 
-- Government and Public Sector
('10', 'Government', 'Government organizations and agencies', 'government', 1),
('11', 'Local Government', 'Local government entities', 'government', 2),
('12', 'Other Public Sector', 'Other public sector organizations', 'government', 3),

-- NGOs and Civil Society
('21', 'International NGO', 'International non-governmental organizations', 'ngo', 4),
('22', 'National NGO', 'National non-governmental organizations', 'ngo', 5),
('23', 'Partner Country based NGO', 'NGOs based in partner countries', 'ngo', 6),

-- Regional and Partnerships
('30', 'Regional Organisation', 'Regional organizations and bodies', 'regional', 7),
('31', 'Public Private Partnership', 'Public-private partnership entities', 'partnership', 8),

-- Multilateral
('40', 'Multilateral', 'Multilateral organizations and institutions', 'multilateral', 9),

-- Private Sector and Foundations
('60', 'Foundation', 'Private foundations and philanthropic organizations', 'private', 10),
('70', 'Private Sector in Provider Country', 'Private sector organizations in donor countries', 'private', 11),
('71', 'Private Sector in Aid Recipient Country', 'Private sector in recipient countries', 'private', 12),
('72', 'Private Sector in Third Country', 'Private sector in third countries', 'private', 13),

-- Academic and Other
('80', 'Academic, Training and Research', 'Academic and research institutions', 'academic', 14),
('90', 'Other', 'Other organization types', 'other', 15)

ON CONFLICT (code) DO UPDATE SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Create function to get organization type by legacy type string
CREATE OR REPLACE FUNCTION get_organization_type_id(legacy_type TEXT)
RETURNS UUID AS $$
DECLARE
    type_id UUID;
BEGIN
    -- First try direct code match
    SELECT id INTO type_id FROM organization_types WHERE code = legacy_type;
    
    IF type_id IS NOT NULL THEN
        RETURN type_id;
    END IF;
    
    -- Then try legacy mappings
    SELECT id INTO type_id FROM organization_types 
    WHERE code = CASE legacy_type
        WHEN 'development_partner' THEN '40'
        WHEN 'partner_government' THEN '10'
        WHEN 'implementing_partner' THEN '22'
        WHEN 'civil_society' THEN '23'
        WHEN 'private_sector' THEN '70'
        WHEN 'bilateral' THEN '10'
        WHEN 'multilateral' THEN '40'
        WHEN 'ingo' THEN '21'
        WHEN 'ngo' THEN '22'
        WHEN 'un' THEN '40'
        WHEN 'government' THEN '10'
        WHEN 'academic' THEN '80'
        ELSE '90'
    END;
    
    -- Default to 'Other' if no match
    IF type_id IS NULL THEN
        SELECT id INTO type_id FROM organization_types WHERE code = '90';
    END IF;
    
    RETURN type_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for organization type statistics
CREATE OR REPLACE VIEW organization_type_stats AS
SELECT 
    ot.id,
    ot.code,
    ot.label,
    ot.description,
    ot.category,
    COUNT(o.id) as organization_count,
    ot.sort_order
FROM organization_types ot
LEFT JOIN organizations o ON (
    o.type = ot.code 
    OR o.organization_type = ot.code
    OR get_organization_type_id(COALESCE(o.type, o.organization_type, 'other')) = ot.id
)
WHERE ot.is_active = true
GROUP BY ot.id, ot.code, ot.label, ot.description, ot.category, ot.sort_order
ORDER BY ot.sort_order, ot.label; 