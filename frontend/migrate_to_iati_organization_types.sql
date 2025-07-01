-- Step 1: Create a temporary table to store the new organization types
CREATE TEMPORARY TABLE temp_organization_types (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER NOT NULL
);

-- Step 2: Insert the new IATI-compliant organization types
INSERT INTO temp_organization_types (code, label, description, sort_order) VALUES
('10', 'Government', 'Central government bodies or ministries', 1),
('11', 'Local Government', 'Any local (sub national) government organisation in either donor or recipient country', 2),
('15', 'Other Public Sector', 'Semi-autonomous public bodies, utilities, parastatals', 3),
('21', 'International NGO', 'NGOs operating internationally, headquartered in another country', 4),
('22', 'National NGO', 'NGOs headquartered and operating within the same country', 5),
('23', 'Regional NGO', 'NGOs operating across multiple countries in a region', 6),
('24', 'Partner Country based NGO', 'Local and National NGO / CSO based in aid/assistance recipient country', 7),
('30', 'Public Private Partnership', 'Joint public–private organisational structure', 8),
('40', 'Multilateral', 'Intergovernmental organisations with global/regional mandates (e.g. UN, MDBs)', 9),
('60', 'Foundation', 'Charitable and philanthropic grant-making bodies', 10),
('70', 'Private Sector', 'Unspecified private sector actor', 11),
('71', 'Private Sector in Provider Country', 'Private sector company operating in the donor/provider country', 12),
('72', 'Private Sector in Aid Recipient Country', 'Private sector company operating in the aid recipient country', 13),
('73', 'Private Sector in Third Country', 'Private sector company not located in donor or recipient country', 14),
('80', 'Academic, Training and Research', 'Universities, think tanks, research institutions', 15),
('90', 'Other', 'Organisations that do not fit into any defined category', 16);

-- Step 3: Create a mapping table for old to new organization types
CREATE TEMPORARY TABLE type_mapping (
    old_type TEXT,
    new_code TEXT,
    is_domestic BOOLEAN
);

-- Step 4: Insert mapping rules
INSERT INTO type_mapping (old_type, new_code, is_domestic) VALUES
-- Government types
('government', '10', true),
('government', '11', true),
('government', '15', true),
-- NGO types
('ngo', '22', true),
('ngo', '21', false),
('ingo', '21', false),
-- UN/Multilateral types
('un', '40', false),
('multilateral', '40', false),
-- Private sector types
('private', '70', false),
-- Academic types
('academic', '80', false),
-- Other types
('other', '90', false),
('bilateral', '40', false);

-- Step 5: Create a log table for organizations that need review
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

-- Step 6: Update the organizations table with new types
WITH updated_organizations AS (
    SELECT 
        o.id,
        o.organisation_type as old_type,
        o.country,
        CASE 
            WHEN o.country = 'Myanmar' THEN true
            ELSE false
        END as is_domestic,
        COALESCE(
            tm.new_code,
            CASE 
                WHEN o.country = 'Myanmar' THEN '22'
                ELSE '21'
            END
        ) as new_type
    FROM organizations o
    LEFT JOIN type_mapping tm ON 
        tm.old_type = o.organisation_type AND
        tm.is_domestic = (o.country = 'Myanmar')
)
UPDATE organizations o
SET 
    organisation_type = uo.new_type,
    updated_at = NOW()
FROM updated_organizations uo
WHERE o.id = uo.id;

-- Step 7: Log organizations that were set to '90' (Other)
INSERT INTO organization_type_migration_log (
    organization_id,
    old_type,
    new_type,
    country,
    needs_review
)
SELECT 
    id,
    organisation_type,
    '90',
    country,
    true
FROM organizations
WHERE organisation_type = '90';

-- Step 8: Replace the organization_types table with new data
TRUNCATE TABLE organization_types;
INSERT INTO organization_types (code, label, description, is_active, sort_order)
SELECT code, label, description, is_active, sort_order
FROM temp_organization_types;

-- Step 9: Clean up temporary tables
DROP TABLE temp_organization_types;
DROP TABLE type_mapping;

-- Step 10: Verify the migration
SELECT 
    code,
    label,
    description,
    is_active,
    sort_order
FROM organization_types 
ORDER BY sort_order; 