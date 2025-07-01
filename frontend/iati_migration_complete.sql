-- IATI Organization Types Migration Script
-- Run this complete script in your Supabase SQL Editor

-- Step 1: Create the migration log table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS organization_type_migration_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    old_type TEXT,
    new_type TEXT,
    country TEXT,
    migration_date TIMESTAMPTZ DEFAULT NOW(),
    needs_review BOOLEAN DEFAULT true,
    review_notes TEXT
);

-- Step 2: Create a backup of current organization types
CREATE TABLE IF NOT EXISTS organization_types_backup AS 
SELECT * FROM organization_types;

-- Step 3: Create a backup of current organization mappings
CREATE TABLE IF NOT EXISTS organizations_backup AS 
SELECT id, organisation_type, country FROM organizations;

-- Step 4: Log existing organizations before migration
INSERT INTO organization_type_migration_log (organization_id, old_type, country, needs_review)
SELECT id, organisation_type, country, false
FROM organizations;

-- Step 5: Update organizations to new IATI types
UPDATE organizations
SET organisation_type = 
    CASE 
        -- Government mappings
        WHEN organisation_type = '10' AND country = 'Myanmar' THEN '10'
        WHEN organisation_type = '20' AND country = 'Myanmar' THEN '15' -- Public Sector to Other Public Sector
        
        -- NGO mappings
        WHEN organisation_type = '15' AND country = 'Myanmar' THEN '22' -- National NGO
        WHEN organisation_type = '15' AND country != 'Myanmar' THEN '21' -- International NGO
        WHEN organisation_type = 'ngo' AND country = 'Myanmar' THEN '22'
        WHEN organisation_type = 'ngo' AND country != 'Myanmar' THEN '21'
        WHEN organisation_type = 'ingo' THEN '21'
        
        -- Bilateral/Multilateral mappings
        WHEN organisation_type = '22' THEN '40' -- Old Multilateral to new Multilateral
        WHEN organisation_type = '23' THEN '40' -- Old Bilateral to new Multilateral
        WHEN organisation_type = 'bilateral' THEN '40'
        WHEN organisation_type = 'multilateral' THEN '40'
        WHEN organisation_type = 'un' THEN '40'
        
        -- Private sector mappings
        WHEN organisation_type = '30' THEN '70' -- Old Private Sector to new Private Sector
        WHEN organisation_type = 'private' THEN '70'
        
        -- Academic mappings
        WHEN organisation_type = '40' THEN '80' -- Old Academic to new Academic
        WHEN organisation_type = 'academic' THEN '80'
        
        -- Foundation mappings
        WHEN organisation_type = '60' THEN '60' -- Foundations stay the same
        
        -- PPP mappings
        WHEN organisation_type = '21' THEN '30' -- Old PPP to new PPP
        
        -- Other mappings
        WHEN organisation_type = '70' THEN '90' -- Old Other to new Other
        WHEN organisation_type = 'other' THEN '90'
        
        -- Default mapping based on location
        WHEN country = 'Myanmar' THEN '22' -- Default to National NGO
        ELSE '21' -- Default to International NGO
    END,
    updated_at = NOW();

-- Step 6: Update organizations that were mapped to "Other" for review
UPDATE organization_type_migration_log
SET new_type = o.organisation_type,
    needs_review = (o.organisation_type = '90')
FROM organizations o
WHERE organization_type_migration_log.organization_id = o.id;

-- Step 7: Clear the organization_types table
TRUNCATE TABLE organization_types;

-- Step 8: Insert new IATI-compliant organization types
INSERT INTO organization_types (code, label, description, is_active, sort_order) VALUES
('10', 'Government', 'Central government bodies or ministries', true, 1),
('11', 'Local Government', 'Any local (sub national) government organisation in either donor or recipient country', true, 2),
('15', 'Other Public Sector', 'Semi-autonomous public bodies, utilities, parastatals', true, 3),
('21', 'International NGO', 'NGOs operating internationally, headquartered in another country', true, 4),
('22', 'National NGO', 'NGOs headquartered and operating within the same country', true, 5),
('23', 'Regional NGO', 'NGOs operating across multiple countries in a region', true, 6),
('24', 'Partner Country based NGO', 'Local and National NGO / CSO based in aid/assistance recipient country', true, 7),
('30', 'Public Private Partnership', 'Joint public–private organisational structure', true, 8),
('40', 'Multilateral', 'Intergovernmental organisations with global/regional mandates (e.g. UN, MDBs)', true, 9),
('60', 'Foundation', 'Charitable and philanthropic grant-making bodies', true, 10),
('70', 'Private Sector', 'Unspecified private sector actor', true, 11),
('71', 'Private Sector in Provider Country', 'Private sector company operating in the donor/provider country', true, 12),
('72', 'Private Sector in Aid Recipient Country', 'Private sector company operating in the aid recipient country', true, 13),
('73', 'Private Sector in Third Country', 'Private sector company not located in donor or recipient country', true, 14),
('80', 'Academic, Training and Research', 'Universities, think tanks, research institutions', true, 15),
('90', 'Other', 'Organisations that do not fit into any defined category', true, 16);

-- Step 9: Verify the migration
SELECT 'Migration Summary:' as info;

SELECT 
    'Total organization types: ' || COUNT(*) as result
FROM organization_types;

SELECT 
    'Organizations migrated: ' || COUNT(*) as result
FROM organizations;

SELECT 
    'Organizations needing review (type = Other): ' || COUNT(*) as result
FROM organizations
WHERE organisation_type = '90';

-- Step 10: Show organizations that need review
SELECT 
    o.id,
    o.name,
    o.country,
    o.organisation_type as new_type,
    l.old_type
FROM organizations o
JOIN organization_type_migration_log l ON o.id = l.organization_id
WHERE o.organisation_type = '90'
ORDER BY o.name;

-- Step 11: Show the new organization types
SELECT 
    code,
    label,
    description,
    sort_order
FROM organization_types
ORDER BY sort_order; 