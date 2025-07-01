-- Quick fix for empty string iati_org_id values
-- This is a minimal fix if you only have empty string duplicates

-- Show what will be changed
SELECT COUNT(*) as count, 'Empty string iati_org_id values to be converted to NULL' as description
FROM organizations
WHERE iati_org_id = '';

-- Convert empty strings to NULL
UPDATE organizations
SET iati_org_id = NULL
WHERE iati_org_id = '';

-- Verify the fix
SELECT COUNT(*) as remaining_empty_strings
FROM organizations
WHERE iati_org_id = '';

-- Check if we can now add the unique constraint
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
  ) dups;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ No duplicates found! You can now run the migration.';
  ELSE
    RAISE NOTICE '⚠️  Still have % duplicate iati_org_id values. Run fix_duplicate_iati_org_ids.sql for a complete fix.', duplicate_count;
  END IF;
END $$; 