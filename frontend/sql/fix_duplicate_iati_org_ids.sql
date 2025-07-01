-- Fix duplicate iati_org_id values in organizations table
-- This script must be run before adding the unique constraint

-- Step 1: Identify duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
  empty_string_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT iati_org_id, COUNT(*) as cnt
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Count empty strings
  SELECT COUNT(*) INTO empty_string_count
  FROM organizations
  WHERE iati_org_id = '';
  
  RAISE NOTICE 'Found % duplicate iati_org_id values', duplicate_count;
  RAISE NOTICE 'Found % organizations with empty string iati_org_id', empty_string_count;
END $$;

-- Step 2: Show duplicate details
SELECT 
  iati_org_id,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as organization_ids,
  STRING_AGG(name, ' | ') as organization_names
FROM organizations
WHERE iati_org_id IS NOT NULL
GROUP BY iati_org_id
HAVING COUNT(*) > 1
ORDER BY count DESC, iati_org_id;

-- Step 3: Fix empty strings - convert to NULL
-- Empty strings should be NULL for proper uniqueness constraint
UPDATE organizations
SET iati_org_id = NULL
WHERE iati_org_id = '';

-- Step 4: Fix other duplicates by appending a sequence number
-- This preserves the data while making it unique
DO $$
DECLARE
  dup_record RECORD;
  org_record RECORD;
  counter INTEGER;
BEGIN
  -- Process each set of duplicates
  FOR dup_record IN 
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
  LOOP
    counter := 0;
    
    -- Process each organization with this duplicate iati_org_id
    FOR org_record IN
      SELECT id, name
      FROM organizations
      WHERE iati_org_id = dup_record.iati_org_id
      ORDER BY created_at, id  -- Keep the oldest one unchanged
    LOOP
      IF counter > 0 THEN
        -- Append sequence number to make it unique
        UPDATE organizations
        SET iati_org_id = dup_record.iati_org_id || '-' || counter
        WHERE id = org_record.id;
        
        RAISE NOTICE 'Updated organization % (%) iati_org_id to %', 
          org_record.name, org_record.id, dup_record.iati_org_id || '-' || counter;
      END IF;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 5: Verify no duplicates remain
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
  ) dups;
  
  IF remaining_duplicates > 0 THEN
    RAISE EXCEPTION 'Still have % duplicate iati_org_id values!', remaining_duplicates;
  ELSE
    RAISE NOTICE '✅ All duplicates resolved. Safe to add unique constraint.';
  END IF;
END $$;

-- Optional: Show the changes that were made
SELECT 
  id,
  name,
  iati_org_id,
  CASE 
    WHEN iati_org_id LIKE '%-_%' THEN 'Modified to resolve duplicate'
    WHEN iati_org_id IS NULL THEN 'Converted from empty string to NULL'
    ELSE 'Original'
  END as status
FROM organizations
WHERE iati_org_id LIKE '%-_%' 
   OR iati_org_id IS NULL
ORDER BY iati_org_id; 