-- Fix NULL and duplicate iati_id values before IATI alignment migration
-- This version uses only standard SQL (no psql meta-commands)

-- Step 1: Show current issues
-- Count NULL values
SELECT 
  'NULL iati_id count' as issue_type,
  COUNT(*) as count
FROM activities
WHERE iati_id IS NULL;

-- Show duplicates
SELECT 
  'Duplicate: ' || iati_id as issue_type,
  COUNT(*) as count
FROM activities
WHERE iati_id IS NOT NULL
GROUP BY iati_id
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- Step 2: Fix NULL iati_id values
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

-- Step 3: Fix duplicate iati_id values
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
-- Check for remaining NULL values
SELECT 
  'Remaining NULL iati_id' as check_type,
  COUNT(*) as count
FROM activities
WHERE iati_id IS NULL;

-- Check for remaining duplicates
SELECT 
  'Remaining duplicates' as check_type,
  COUNT(DISTINCT iati_id) as count
FROM (
  SELECT iati_id
  FROM activities
  WHERE iati_id IS NOT NULL
  GROUP BY iati_id
  HAVING COUNT(*) > 1
) dups;

-- Show sample of fixed IDs
SELECT 
  'Sample fixed IDs' as info,
  id,
  iati_id,
  CASE 
    WHEN iati_id LIKE '%-____-____-____-____________' THEN 'Generated from UUID'
    WHEN iati_id ~ '-[0-9]+$' THEN 'Fixed duplicate with suffix'
    ELSE 'Original'
  END as fix_type
FROM activities
WHERE iati_id LIKE '%-%-%-%'
   OR iati_id ~ '-[0-9]+$'
ORDER BY created_at DESC
LIMIT 10; 