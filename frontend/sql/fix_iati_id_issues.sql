-- Fix NULL and duplicate iati_id values before IATI alignment migration
-- This script prepares the activities table for the unique constraint

\echo '===== FIXING IATI_ID ISSUES ====='
\echo ''

-- Step 1: Show current issues
\echo 'Current issues with iati_id:'
\echo ''

-- Count NULL valuesafix_iati_id_issues.sql
SELECT 
  COUNT(*) as null_count,
  'Activities with NULL iati_id' as description
FROM activities
WHERE iati_id IS NULL;

-- Show duplicates
\echo ''
\echo 'Duplicate iati_id values:'
SELECT 
  iati_id,
  COUNT(*) as count,
  STRING_AGG(CAST(id AS TEXT), ', ') as activity_ids
FROM activities
WHERE iati_id IS NOT NULL
GROUP BY iati_id
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- Step 2: Fix NULL iati_id values
\echo ''
\echo 'Fixing NULL iati_id values...'

-- Generate iati_id for activities missing it
-- Format: {reporting-org-ref}-{activity-uuid}
UPDATE activities a
SET iati_id = CONCAT(
  COALESCE(
    (SELECT o.iati_org_id 
     FROM organizations o 
     WHERE o.id = COALESCE(a.reporting_org_id, a.created_by_org)),
    'UNKNOWN'
  ),
  '-',
  a.id
)
WHERE a.iati_id IS NULL;

-- Show how many were fixed
DO $$
DECLARE
  remaining_nulls INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_nulls
  FROM activities
  WHERE iati_id IS NULL;
  
  IF remaining_nulls = 0 THEN
    RAISE NOTICE '✅ All NULL iati_id values have been fixed';
  ELSE
    RAISE NOTICE '⚠️  Still have % NULL iati_id values', remaining_nulls;
  END IF;
END $$;

-- Step 3: Fix duplicate iati_id values
\echo ''
\echo 'Fixing duplicate iati_id values...'

-- Add sequence numbers to duplicates (keeping the oldest unchanged)
WITH duplicates AS (
  SELECT 
    id,
    iati_id,
    ROW_NUMBER() OVER (
      PARTITION BY iati_id 
      ORDER BY created_at, id
    ) - 1 as seq_num
  FROM activities
  WHERE iati_id IS NOT NULL
    AND iati_id IN (
      SELECT iati_id 
      FROM activities 
      WHERE iati_id IS NOT NULL
      GROUP BY iati_id 
      HAVING COUNT(*) > 1
    )
)
UPDATE activities a
SET iati_id = d.iati_id || '-' || d.seq_num
FROM duplicates d
WHERE a.id = d.id 
  AND d.seq_num > 0;

-- Step 4: Verify fixes
\echo ''
\echo '===== VERIFICATION ====='
\echo ''

-- Check for remaining issues
DO $$
DECLARE
  null_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Count NULLs
  SELECT COUNT(*) INTO null_count
  FROM activities
  WHERE iati_id IS NULL;
  
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT iati_id
    FROM activities
    WHERE iati_id IS NOT NULL
    GROUP BY iati_id
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'NULL iati_id values: %', null_count;
  RAISE NOTICE 'Duplicate iati_id values: %', duplicate_count;
  
  IF null_count = 0 AND duplicate_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ All iati_id issues have been resolved!';
    RAISE NOTICE 'You can now run the IATI alignment migration safely.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Some issues remain. Please investigate manually.';
  END IF;
END $$;

-- Show sample of fixed IDs
\echo ''
\echo 'Sample of generated/fixed iati_id values:'
SELECT 
  id,
  iati_id,
  CASE 
    WHEN iati_id LIKE '%-____-____-____-____________' THEN 'Generated from UUID'
    WHEN iati_id LIKE '%-%-%" THEN 'Fixed duplicate with suffix'
    ELSE 'Original'
  END as fix_type
FROM activities
WHERE iati_id LIKE '%-%-%-%'
   OR iati_id LIKE '%-%" 
ORDER BY created_at DESC
LIMIT 10; 