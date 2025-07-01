-- Simple script to update organization_types table to IATI-compliant types
-- Run this in your Supabase SQL Editor

-- Step 1: Backup current organization types (optional)
CREATE TABLE IF NOT EXISTS organization_types_backup_before_iati AS 
SELECT * FROM organization_types;

-- Step 2: Clear the organization_types table
DELETE FROM organization_types;

-- Step 3: Insert new IATI-compliant organization types
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

-- Step 4: Verify the new types are inserted
SELECT 
    code,
    label,
    description,
    sort_order
FROM organization_types
ORDER BY sort_order; 