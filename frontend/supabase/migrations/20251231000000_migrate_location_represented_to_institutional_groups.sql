-- Migration: Update Location Represented values from "Global or Regional" to specific institutional groups
-- This migration provides a framework to update organizations with legacy "Global or Regional" values
-- to their specific institutional group based on IATI org identifiers or organization names

-- First, let's see what organizations have "Global or Regional"
-- Run this query to identify organizations that need updating:
-- SELECT id, name, acronym, iati_org_id, country_represented 
-- FROM organizations 
-- WHERE country_represented = 'Global or Regional';

-- Create a temporary mapping table for common organizations
-- This helps identify which institutional group each organization should belong to
CREATE TEMP TABLE IF NOT EXISTS org_institutional_group_mapping (
    iati_prefix VARCHAR(50),
    name_pattern VARCHAR(255),
    institutional_group VARCHAR(100)
);

-- Insert mappings based on IATI org identifier prefixes and common names
INSERT INTO org_institutional_group_mapping (iati_prefix, name_pattern, institutional_group) VALUES
-- United Nations agencies
('XM-DAC-41', NULL, 'United Nations'),
(NULL, '%UNDP%', 'UNDP'),
(NULL, '%UNICEF%', 'UNICEF'),
(NULL, '%UNHCR%', 'UNHCR'),
(NULL, '%World Food Programme%', 'WFP'),
(NULL, '%WFP%', 'WFP'),
(NULL, '%World Health%', 'WHO'),
(NULL, '%WHO%', 'WHO'),
(NULL, '%FAO%', 'FAO'),
(NULL, '%UNESCO%', 'UNESCO'),
(NULL, '%UNEP%', 'UNEP'),
(NULL, '%UNFPA%', 'UNFPA'),
(NULL, '%OCHA%', 'OCHA'),
(NULL, '%UN Women%', 'UN Women'),
(NULL, '%ILO%', 'ILO'),
(NULL, '%IFAD%', 'IFAD'),
(NULL, '%UNIDO%', 'UNIDO'),
(NULL, '%UNRWA%', 'UNRWA'),
(NULL, '%UNAIDS%', 'UNAIDS'),
(NULL, '%UN-Habitat%', 'UN-Habitat'),
(NULL, '%CERF%', 'CERF'),
(NULL, '%IAEA%', 'IAEA'),

-- European Union Institutions
('XM-DAC-42', NULL, 'European Union Institutions'),
('XI-IATI-EC_', NULL, 'European Union Institutions'),
(NULL, '%European Commission%', 'European Commission'),
(NULL, '%EU-ECHO%', 'European Commission'),
(NULL, '%ECHO%', 'European Commission'),
(NULL, '%European Investment Bank%', 'EIB'),
(NULL, '%EIB%', 'EIB'),

-- International Monetary Fund
('XM-DAC-43', NULL, 'International Monetary Fund'),
(NULL, '%IMF%', 'International Monetary Fund'),
(NULL, '%International Monetary Fund%', 'International Monetary Fund'),

-- World Bank Group
('XM-DAC-44', NULL, 'World Bank Group'),
(NULL, '%World Bank%', 'World Bank Group'),
(NULL, '%IBRD%', 'IBRD'),
(NULL, '%IDA%', 'IDA'),
(NULL, '%IFC%', 'IFC'),
(NULL, '%MIGA%', 'MIGA'),

-- World Trade Organisation
('XM-DAC-45', NULL, 'World Trade Organisation'),
(NULL, '%WTO%', 'World Trade Organisation'),

-- Regional Development Banks
('XM-DAC-46', NULL, 'Regional Development Banks'),
(NULL, '%Asian Development Bank%', 'Asian Development Bank'),
(NULL, '%ADB%', 'Asian Development Bank'),
(NULL, '%African Development Bank%', 'African Development Bank'),
(NULL, '%AfDB%', 'African Development Bank'),
(NULL, '%Inter-American Development Bank%', 'Inter-American Development Bank'),
(NULL, '%IDB%', 'Inter-American Development Bank'),
(NULL, '%EBRD%', 'EBRD'),
(NULL, '%AIIB%', 'AIIB'),
(NULL, '%Islamic Development Bank%', 'IsDB'),
(NULL, '%Caribbean Development Bank%', 'Caribbean Development Bank'),

-- Other Multilateral Institutions
('XM-DAC-47', NULL, 'Other Multilateral Institutions'),
(NULL, '%African Union%', 'African Union'),
(NULL, '%ASEAN%', 'ASEAN'),
(NULL, '%CGIAR%', 'CGIAR'),
(NULL, '%Green Climate Fund%', 'GCF'),
(NULL, '%GCF%', 'GCF'),
(NULL, '%GAVI%', 'GAVI'),
(NULL, '%Global Fund%', 'Global Fund'),
(NULL, '%CARICOM%', 'CARICOM'),
(NULL, '%Commonwealth%', 'Commonwealth Foundation');

-- Update organizations based on IATI identifier prefix
UPDATE organizations o
SET country_represented = m.institutional_group,
    updated_at = NOW()
FROM org_institutional_group_mapping m
WHERE o.country_represented = 'Global or Regional'
  AND m.iati_prefix IS NOT NULL
  AND o.iati_org_id LIKE m.iati_prefix || '%';

-- Update organizations based on name pattern (for those not matched by IATI prefix)
UPDATE organizations o
SET country_represented = m.institutional_group,
    updated_at = NOW()
FROM org_institutional_group_mapping m
WHERE o.country_represented = 'Global or Regional'
  AND m.name_pattern IS NOT NULL
  AND (o.name ILIKE m.name_pattern OR o.acronym ILIKE m.name_pattern);

-- For any remaining organizations with "Global or Regional" that weren't matched,
-- set them to "Other Multilateral Institutions" as a fallback
-- (You may want to review these manually first)
-- 
-- Uncomment to apply:
-- UPDATE organizations 
-- SET country_represented = 'Other Multilateral Institutions',
--     updated_at = NOW()
-- WHERE country_represented = 'Global or Regional';

-- Clean up
DROP TABLE IF EXISTS org_institutional_group_mapping;

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration complete. Organizations with "Global or Regional" have been updated to specific institutional groups.';
    RAISE NOTICE 'Run the following query to check remaining unmatched organizations:';
    RAISE NOTICE 'SELECT id, name, acronym, iati_org_id, country_represented FROM organizations WHERE country_represented = ''Global or Regional'';';
END $$;

