-- Update organization_types reference table with complete IATI standard data
-- This ensures the organization_types lookup table matches the full IATI specification

-- Clear existing data and insert complete IATI standard organization types
TRUNCATE organization_types CASCADE;

-- Insert complete IATI organization type codes and names
INSERT INTO organization_types (code, label, description, category, sort_order, is_active) VALUES
-- Government and Public Sector
('10', 'Government', 'Government organizations and agencies', 'government', 1, true),
('11', 'Local Government', 'Any local (sub national) government organisation in either donor or recipient country', 'government', 2, true),
('15', 'Other Public Sector', 'Other public sector organizations', 'government', 3, true),

-- NGOs and Civil Society
('21', 'International NGO', 'International non-governmental organizations', 'ngo', 4, true),
('22', 'National NGO', 'National non-governmental organizations', 'ngo', 5, true),
('23', 'Regional NGO', 'Regional non-governmental organizations', 'ngo', 6, true),
('24', 'Partner Country based NGO', 'Local and National NGO / CSO based in aid/assistance recipient country', 'ngo', 7, true),

-- Partnerships
('30', 'Public Private Partnership', 'Public-private partnership entities', 'partnership', 8, true),

-- Multilateral
('40', 'Multilateral', 'Multilateral organizations and institutions', 'multilateral', 9, true),

-- Private Sector and Foundations
('60', 'Foundation', 'Private foundations and philanthropic organizations', 'foundation', 10, true),
('70', 'Private Sector', 'Private sector organizations', 'private', 11, true),
('71', 'Private Sector in Provider Country', 'Is in provider / donor country', 'private', 12, true),
('72', 'Private Sector in Aid Recipient Country', 'Is in aid recipient country', 'private', 13, true),
('73', 'Private Sector in Third Country', 'Is not in either a donor or aid recipient country', 'private', 14, true),

-- Academic and Other
('80', 'Academic, Training and Research', 'Academic and research institutions', 'academic', 15, true),
('90', 'Other', 'Other organization types', 'other', 16, true)

ON CONFLICT (code) DO UPDATE SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify the update
SELECT code, label, description, category, sort_order 
FROM organization_types 
ORDER BY sort_order;

