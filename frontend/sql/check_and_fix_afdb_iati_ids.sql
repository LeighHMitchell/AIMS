-- Check if AFDB has incorrect test IATI IDs
-- These are test IDs from the XML import and should not be assigned to AFDB

SELECT 
  id,
  name,
  acronym,
  iati_org_id,
  logo
FROM organizations
WHERE iati_org_id IN ('BB-BBB-123456789', 'CC-CCC-123456789', 'AA-AAA-123456789')
OR name ILIKE '%african development bank%';

-- If the above query shows AFDB with one of these test IATI IDs, run this to clear them:
/*
UPDATE organizations
SET iati_org_id = NULL
WHERE iati_org_id IN ('BB-BBB-123456789', 'CC-CCC-123456789', 'AA-AAA-123456789')
AND name ILIKE '%african development bank%';
*/

-- Check what AFDB's real IATI ID should be:
-- AFDB's real IATI ID is: XM-DAC-46002 or 46002
-- Update if needed:
/*
UPDATE organizations
SET iati_org_id = 'XM-DAC-46002'
WHERE name ILIKE '%african development bank%'
AND (iati_org_id IS NULL OR iati_org_id IN ('BB-BBB-123456789', 'CC-CCC-123456789', 'AA-AAA-123456789'));
*/


