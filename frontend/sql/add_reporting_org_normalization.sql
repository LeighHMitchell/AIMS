-- Normalize reporting-org information in activities table
-- This migration adds a foreign key reference to organizations table to avoid duplication
-- and ensure referential integrity for IATI reporting-org fields

-- Step 1: Check for duplicates before adding unique constraint
DO $$ 
DECLARE
  duplicate_count INTEGER;
  empty_string_count INTEGER;
BEGIN
  -- Check for duplicate iati_org_id values
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
  ) dups;
  
  -- Check for empty strings
  SELECT COUNT(*) INTO empty_string_count
  FROM organizations
  WHERE iati_org_id = '';
  
  IF duplicate_count > 0 OR empty_string_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Cannot add unique constraint - found duplicate iati_org_id values!';
    RAISE NOTICE 'Duplicate non-empty values: %', duplicate_count;
    RAISE NOTICE 'Empty string values: %', empty_string_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Please run fix_duplicate_iati_org_ids.sql first to resolve duplicates.';
    RAISE NOTICE '';
  ELSE
    -- Add unique constraint if not already present
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'organizations_iati_org_id_unique'
    ) THEN
      ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_iati_org_id_unique UNIQUE (iati_org_id);
      RAISE NOTICE '✅ Added unique constraint on organizations.iati_org_id';
    ELSE
      RAISE NOTICE '✅ Unique constraint on organizations.iati_org_id already exists';
    END IF;
  END IF;
END $$;

-- Step 2: Add reporting_org_id column to activities if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'activities' 
    AND column_name = 'reporting_org_id'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN reporting_org_id UUID;
    COMMENT ON COLUMN public.activities.reporting_org_id IS 'Foreign key reference to organizations table for IATI reporting organization';
  END IF;
END $$;

-- Step 3: Populate reporting_org_id with created_by_org where appropriate
-- Only if created_by_org is not NULL and exists in organizations
UPDATE public.activities
SET reporting_org_id = created_by_org
WHERE created_by_org IS NOT NULL
  AND created_by_org IN (SELECT id FROM public.organizations)
  AND reporting_org_id IS NULL; -- Only update if not already set

-- Step 4: Check for NULL values before enforcing constraints
DO $$ 
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM public.activities 
  WHERE reporting_org_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'There are % activities with NULL reporting_org_id. Consider populating these before enforcing NOT NULL constraint.', null_count;
  END IF;
END $$;

-- Step 5: Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_reporting_org'
  ) THEN
    ALTER TABLE public.activities
    ADD CONSTRAINT fk_reporting_org
    FOREIGN KEY (reporting_org_id)
    REFERENCES public.organizations(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 6: Create a view for easy access to reporting org information
CREATE OR REPLACE VIEW activities_with_reporting_org AS
SELECT
  a.*,
  o.iati_org_id AS reporting_org_ref,
  o.organisation_type AS reporting_org_type,
  o.name AS reporting_org_name
FROM public.activities a
LEFT JOIN public.organizations o ON a.reporting_org_id = o.id;

COMMENT ON VIEW activities_with_reporting_org IS 'Activities with normalized reporting organization information from organizations table';

-- Optional: Enforce NOT NULL constraint (uncomment after ensuring all rows have values)
-- ALTER TABLE public.activities
-- ALTER COLUMN reporting_org_id SET NOT NULL;

-- Verification queries (for manual checking)
-- Check activities without reporting_org_id:
-- SELECT COUNT(*) FROM public.activities WHERE reporting_org_id IS NULL;

-- Check activities with created_by_org that couldn't be mapped:
-- SELECT COUNT(*) FROM public.activities 
-- WHERE created_by_org IS NOT NULL 
-- AND reporting_org_id IS NULL;

-- Sample query to use the normalized data:
-- SELECT
--   a.iati_identifier,
--   o.iati_org_id AS reporting_org_ref,
--   o.organisation_type AS reporting_org_type,
--   o.name AS reporting_org_name
-- FROM public.activities a
-- JOIN public.organizations o ON a.reporting_org_id = o.id
-- LIMIT 10; 