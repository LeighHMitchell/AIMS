-- Migration: Fix organization names - move full names to full_name field and acronyms to acronym field
-- Purpose: Addresses the issue where full organization names are stored in the 'name' field instead of 'full_name'

-- Step 1: Backup current data
CREATE TABLE IF NOT EXISTS organizations_name_backup AS 
SELECT id, name, full_name, acronym, updated_at 
FROM organizations;

-- Step 2: Update organizations where full_name is empty but name contains the full name
-- This assumes that if name has more than 10 characters or contains spaces, it's likely a full name
UPDATE organizations
SET 
  full_name = CASE 
    WHEN full_name IS NULL OR full_name = '' THEN name
    ELSE full_name
  END,
  acronym = CASE
    -- If acronym is already set, keep it
    WHEN acronym IS NOT NULL AND acronym != '' THEN acronym
    -- If name is short (<=10 chars) and no spaces, it's likely an acronym
    WHEN LENGTH(name) <= 10 AND name NOT LIKE '% %' THEN name
    -- Otherwise leave it empty
    ELSE acronym
  END,
  updated_at = NOW()
WHERE 
  (full_name IS NULL OR full_name = '') 
  OR (acronym IS NULL OR acronym = '');

-- Step 3: For organizations where we detected name as acronym, clear the name field
-- This prevents duplication where acronym appears in both name and acronym fields
UPDATE organizations
SET 
  name = COALESCE(full_name, name),
  updated_at = NOW()
WHERE 
  acronym = name 
  AND full_name IS NOT NULL 
  AND full_name != '';

-- Step 4: Handle specific known organizations (examples based on common patterns)
-- You can add more specific cases here based on your data
UPDATE organizations
SET 
  full_name = CASE
    WHEN name = 'DFAT' THEN 'Department of Foreign Affairs and Trade'
    WHEN name = 'ADB' THEN 'Asian Development Bank'
    WHEN name = 'UNDP' THEN 'United Nations Development Programme'
    WHEN name = 'WHO' THEN 'World Health Organization'
    WHEN name = 'UNICEF' THEN 'United Nations Children''s Fund'
    WHEN name = 'WFP' THEN 'World Food Programme'
    WHEN name = 'USAID' THEN 'United States Agency for International Development'
    ELSE full_name
  END,
  acronym = CASE
    WHEN name IN ('DFAT', 'ADB', 'UNDP', 'WHO', 'UNICEF', 'WFP', 'USAID') THEN name
    ELSE acronym
  END,
  updated_at = NOW()
WHERE 
  name IN ('DFAT', 'ADB', 'UNDP', 'WHO', 'UNICEF', 'WFP', 'USAID')
  AND (full_name IS NULL OR full_name = '');

-- Step 5: Ensure name field always has a value (use full_name as fallback)
UPDATE organizations
SET 
  name = COALESCE(
    NULLIF(TRIM(full_name), ''), 
    NULLIF(TRIM(acronym), ''), 
    name
  )
WHERE name IS NULL OR name = '';

-- Step 6: Report on the migration results
SELECT 
  'Migration Summary' as report_type,
  COUNT(*) as total_organizations,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as with_full_name,
  COUNT(CASE WHEN acronym IS NOT NULL AND acronym != '' THEN 1 END) as with_acronym,
  COUNT(CASE WHEN full_name IS NOT NULL AND acronym IS NOT NULL AND full_name != '' AND acronym != '' THEN 1 END) as with_both
FROM organizations;

-- Step 7: Show sample of updated records
SELECT 
  id,
  name,
  full_name,
  acronym,
  organisation_type,
  updated_at
FROM organizations
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC
LIMIT 20; 