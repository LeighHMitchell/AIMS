-- Safe fix for duplicate iati_org_id values in organizations table
-- This script shows what will be changed before making any modifications

-- IMPORTANT: Review the output of this script before uncommenting the UPDATE statements

-- Step 1: Show current duplicate situation
\echo '===== CURRENT DUPLICATE ANALYSIS ====='
\echo ''

-- Show empty strings
\echo 'Organizations with empty string iati_org_id (will be set to NULL):'
SELECT id, name, iati_org_id, created_at
FROM organizations
WHERE iati_org_id = ''
ORDER BY created_at, name;

\echo ''
\echo 'Duplicate non-empty iati_org_id values:'
SELECT 
  iati_org_id,
  COUNT(*) as count,
  STRING_AGG(name || ' (' || id || ')', E'\n    ') as organizations
FROM organizations
WHERE iati_org_id IS NOT NULL 
  AND iati_org_id != ''
GROUP BY iati_org_id
HAVING COUNT(*) > 1
ORDER BY count DESC, iati_org_id;

-- Step 2: Preview what changes will be made
\echo ''
\echo '===== PREVIEW OF CHANGES ====='
\echo ''

-- Preview empty string fixes
\echo 'Empty strings that will be converted to NULL:'
SELECT 
  id,
  name,
  'UPDATE organizations SET iati_org_id = NULL WHERE id = ''' || id || ''';' as update_statement
FROM organizations
WHERE iati_org_id = '';

\echo ''
\echo 'Duplicates that will be renamed (keeping the oldest unchanged):'
WITH duplicates AS (
  SELECT 
    id,
    name,
    iati_org_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY iati_org_id ORDER BY created_at, id) - 1 as suffix_num
  FROM organizations
  WHERE iati_org_id IS NOT NULL 
    AND iati_org_id != ''
    AND iati_org_id IN (
      SELECT iati_org_id
      FROM organizations
      WHERE iati_org_id IS NOT NULL
      GROUP BY iati_org_id
      HAVING COUNT(*) > 1
    )
)
SELECT 
  id,
  name,
  iati_org_id as current_value,
  CASE 
    WHEN suffix_num = 0 THEN iati_org_id || ' (no change - oldest)'
    ELSE iati_org_id || '-' || suffix_num
  END as new_value,
  CASE 
    WHEN suffix_num = 0 THEN '-- No change needed (oldest record)'
    ELSE 'UPDATE organizations SET iati_org_id = ''' || iati_org_id || '-' || suffix_num || ''' WHERE id = ''' || id || ''';'
  END as update_statement
FROM duplicates
ORDER BY iati_org_id, suffix_num;

-- Step 3: Generate fix script
\echo ''
\echo '===== COPY AND RUN THESE COMMANDS TO FIX DUPLICATES ====='
\echo ''
\echo '-- Fix empty strings:'
\echo 'UPDATE organizations SET iati_org_id = NULL WHERE iati_org_id = '''';'
\echo ''
\echo '-- Fix duplicates (run these one by one if preferred):'

WITH duplicates AS (
  SELECT 
    id,
    iati_org_id,
    ROW_NUMBER() OVER (PARTITION BY iati_org_id ORDER BY created_at, id) - 1 as suffix_num
  FROM organizations
  WHERE iati_org_id IS NOT NULL 
    AND iati_org_id != ''
    AND iati_org_id IN (
      SELECT iati_org_id
      FROM organizations
      WHERE iati_org_id IS NOT NULL
      GROUP BY iati_org_id
      HAVING COUNT(*) > 1
    )
)
SELECT 
  'UPDATE organizations SET iati_org_id = ''' || iati_org_id || '-' || suffix_num || ''' WHERE id = ''' || id || ''';' as update_statement
FROM duplicates
WHERE suffix_num > 0
ORDER BY iati_org_id, suffix_num;

\echo ''
\echo '===== VERIFICATION QUERY ====='
\echo 'After running the updates, run this to verify no duplicates remain:'
\echo ''
\echo 'SELECT iati_org_id, COUNT(*) FROM organizations WHERE iati_org_id IS NOT NULL GROUP BY iati_org_id HAVING COUNT(*) > 1;'

/*
-- OPTIONAL: Uncomment these lines to apply the fixes automatically
-- WARNING: This will modify your data! Review the preview above first!

-- Fix empty strings
UPDATE organizations SET iati_org_id = NULL WHERE iati_org_id = '';

-- Fix duplicates
DO $$
DECLARE
  dup_record RECORD;
BEGIN
  FOR dup_record IN 
    WITH duplicates AS (
      SELECT 
        id,
        iati_org_id,
        ROW_NUMBER() OVER (PARTITION BY iati_org_id ORDER BY created_at, id) - 1 as suffix_num
      FROM organizations
      WHERE iati_org_id IS NOT NULL 
        AND iati_org_id != ''
        AND iati_org_id IN (
          SELECT iati_org_id
          FROM organizations
          WHERE iati_org_id IS NOT NULL
          GROUP BY iati_org_id
          HAVING COUNT(*) > 1
        )
    )
    SELECT id, iati_org_id || '-' || suffix_num as new_iati_org_id
    FROM duplicates
    WHERE suffix_num > 0
  LOOP
    UPDATE organizations 
    SET iati_org_id = dup_record.new_iati_org_id 
    WHERE id = dup_record.id;
  END LOOP;
END $$;

*/ 