-- Safe IATI Alignment for activities Table
-- Aligns column names and structure with IATI Activity Standard v2.03
-- This migration is designed to be safe and idempotent

\echo '===== IATI ACTIVITIES TABLE ALIGNMENT MIGRATION ====='
\echo ''

-- =====================================================
-- Step 0: Pre-flight checks
-- =====================================================
\echo 'Step 0: Running pre-flight checks...'

-- Check for NULL iati_id values
DO $$
DECLARE
  null_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.activities 
  WHERE iati_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE '⚠️  Found % activities with NULL iati_id', null_count;
    RAISE NOTICE 'These need to be fixed before adding uniqueness constraint';
  END IF;
  
  -- Check for duplicate iati_id values
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT iati_id
    FROM public.activities
    WHERE iati_id IS NOT NULL
    GROUP BY iati_id
    HAVING COUNT(*) > 1
  ) dups;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️  Found % duplicate iati_id values', duplicate_count;
    RAISE NOTICE 'These need to be fixed before adding uniqueness constraint';
  END IF;
  
  IF null_count = 0 AND duplicate_count = 0 THEN
    RAISE NOTICE '✅ All iati_id values are unique and non-null';
  END IF;
END $$;

-- Show columns that will be renamed
\echo ''
\echo 'Columns to be renamed:'
SELECT 
  column_name,
  CASE column_name
    WHEN 'iati_id' THEN 'iati_identifier'
    WHEN 'title' THEN 'title_narrative'
    WHEN 'description' THEN 'description_narrative'
    WHEN 'tied_status' THEN 'default_tied_status'
    WHEN 'partner_id' THEN 'other_identifier'
  END as new_name
FROM information_schema.columns
WHERE table_name = 'activities'
  AND column_name IN ('iati_id', 'title', 'description', 'tied_status', 'partner_id');

-- =====================================================
-- Step 1: Rename columns (with safety checks)
-- =====================================================
\echo ''
\echo 'Step 1: Renaming columns for IATI alignment...'

-- Function to safely rename a column
CREATE OR REPLACE FUNCTION safe_rename_column(
  p_table_name TEXT,
  p_old_name TEXT,
  p_new_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- Check if old column exists and new column doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = p_old_name
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = p_new_name
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', p_table_name, p_old_name, p_new_name);
    RAISE NOTICE '✅ Renamed % to %', p_old_name, p_new_name;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = p_new_name
  ) THEN
    RAISE NOTICE '✓ Column % already exists (skipping rename)', p_new_name;
  ELSE
    RAISE NOTICE '⚠️  Column % not found (skipping)', p_old_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Rename columns
SELECT safe_rename_column('activities', 'iati_id', 'iati_identifier');
SELECT safe_rename_column('activities', 'title', 'title_narrative');
SELECT safe_rename_column('activities', 'description', 'description_narrative');
SELECT safe_rename_column('activities', 'tied_status', 'default_tied_status');
SELECT safe_rename_column('activities', 'partner_id', 'other_identifier');

-- =====================================================
-- Step 2: Add IATI-required fields
-- =====================================================
\echo ''
\echo 'Step 2: Adding IATI-required fields...'

-- Check if reporting_org_id already exists (from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'reporting_org_id'
  ) THEN
    -- Add reporting_org_id
    ALTER TABLE public.activities ADD COLUMN reporting_org_id UUID;
    COMMENT ON COLUMN public.activities.reporting_org_id IS 'Foreign key reference to organizations table for IATI reporting organization';
    
    -- Backfill from created_by_org if applicable
    UPDATE public.activities
    SET reporting_org_id = created_by_org
    WHERE created_by_org IS NOT NULL
      AND created_by_org IN (SELECT id FROM public.organizations)
      AND reporting_org_id IS NULL;
    
    -- Add FK constraint
    ALTER TABLE public.activities
    ADD CONSTRAINT fk_reporting_org_id
    FOREIGN KEY (reporting_org_id)
    REFERENCES public.organizations(id)
    ON DELETE RESTRICT;
    
    RAISE NOTICE '✅ Added reporting_org_id column and constraint';
  ELSE
    RAISE NOTICE '✓ reporting_org_id already exists';
  END IF;
END $$;

-- Add hierarchy field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'hierarchy'
  ) THEN
    ALTER TABLE public.activities 
    ADD COLUMN hierarchy INTEGER DEFAULT 1 CHECK (hierarchy >= 1);
    COMMENT ON COLUMN public.activities.hierarchy IS 'IATI hierarchy level (1=standalone, 2=parent, 3=child)';
    RAISE NOTICE '✅ Added hierarchy column';
  ELSE
    RAISE NOTICE '✓ hierarchy column already exists';
  END IF;
END $$;

-- Add linked_data_uri field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'linked_data_uri'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN linked_data_uri TEXT;
    COMMENT ON COLUMN public.activities.linked_data_uri IS 'Optional URI for linked data representation of this activity';
    RAISE NOTICE '✅ Added linked_data_uri column';
  ELSE
    RAISE NOTICE '✓ linked_data_uri column already exists';
  END IF;
END $$;

-- =====================================================
-- Step 3: Add constraints and indexes
-- =====================================================
\echo ''
\echo 'Step 3: Adding constraints and indexes...'

-- Add unique constraint on iati_identifier (only if no nulls or duplicates)
DO $$
DECLARE
  null_count INTEGER;
  duplicate_count INTEGER;
  identifier_column TEXT;
BEGIN
  -- Determine which column name exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'iati_identifier'
  ) THEN
    identifier_column := 'iati_identifier';
  ELSE
    identifier_column := 'iati_id';
  END IF;
  
  -- Check for issues
  EXECUTE format('SELECT COUNT(*) FROM public.activities WHERE %I IS NULL', identifier_column) INTO null_count;
  
  EXECUTE format('
    SELECT COUNT(*) FROM (
      SELECT %I FROM public.activities 
      WHERE %I IS NOT NULL 
      GROUP BY %I 
      HAVING COUNT(*) > 1
    ) dups', identifier_column, identifier_column, identifier_column) INTO duplicate_count;
  
  IF null_count = 0 AND duplicate_count = 0 THEN
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'unique_iati_identifier'
    ) THEN
      EXECUTE format('ALTER TABLE public.activities ADD CONSTRAINT unique_iati_identifier UNIQUE (%I)', identifier_column);
      RAISE NOTICE '✅ Added unique constraint on %', identifier_column;
    ELSE
      RAISE NOTICE '✓ Unique constraint already exists';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Cannot add unique constraint:';
    IF null_count > 0 THEN
      RAISE NOTICE '   - % NULL values found', null_count;
    END IF;
    IF duplicate_count > 0 THEN
      RAISE NOTICE '   - % duplicate values found', duplicate_count;
    END IF;
    RAISE NOTICE '   Fix these issues before adding the constraint';
  END IF;
END $$;

-- Add index on reporting_org_id for better join performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'activities' 
    AND indexname = 'idx_activities_reporting_org_id'
  ) THEN
    CREATE INDEX idx_activities_reporting_org_id ON public.activities(reporting_org_id);
    RAISE NOTICE '✅ Added index on reporting_org_id';
  ELSE
    RAISE NOTICE '✓ Index on reporting_org_id already exists';
  END IF;
END $$;

-- =====================================================
-- Step 4: Create or update the IATI-compliant view
-- =====================================================
\echo ''
\echo 'Step 4: Creating IATI-compliant view...'

CREATE OR REPLACE VIEW activities_iati_compliant AS
SELECT
  a.id,
  COALESCE(a.iati_identifier, a.iati_id) as iati_identifier,
  COALESCE(a.title_narrative, a.title) as title_narrative,
  COALESCE(a.description_narrative, a.description) as description_narrative,
  o.iati_org_id AS reporting_org_ref,
  o.organisation_type AS reporting_org_type,
  o.name AS reporting_org_name,
  a.activity_status,
  a.activity_date_start,
  a.activity_date_end,
  COALESCE(a.default_tied_status, a.tied_status) as default_tied_status,
  a.default_currency,
  a.hierarchy,
  a.linked_data_uri,
  COALESCE(a.other_identifier, a.partner_id) as other_identifier,
  a.created_at,
  a.updated_at
FROM public.activities a
LEFT JOIN public.organizations o ON a.reporting_org_id = o.id;

COMMENT ON VIEW activities_iati_compliant IS 'IATI-compliant view of activities with normalized field names';

-- =====================================================
-- Step 5: Verification
-- =====================================================
\echo ''
\echo 'Step 5: Verifying migration...'

-- Show sample of migrated data
\echo ''
\echo 'Sample of IATI-aligned activities:'
SELECT
  iati_identifier,
  reporting_org_ref,
  reporting_org_name,
  LEFT(title_narrative, 50) as title_preview,
  hierarchy,
  activity_status
FROM activities_iati_compliant
WHERE reporting_org_id IS NOT NULL
LIMIT 5;

-- Summary
\echo ''
\echo '===== MIGRATION SUMMARY ====='
SELECT 
  'Total Activities' as metric,
  COUNT(*) as count
FROM activities
UNION ALL
SELECT 
  'With Reporting Org' as metric,
  COUNT(*) as count
FROM activities
WHERE reporting_org_id IS NOT NULL
UNION ALL
SELECT 
  'With IATI Identifier' as metric,
  COUNT(*) as count
FROM activities
WHERE (
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'activities' AND column_name = 'iati_identifier'
    ) THEN iati_identifier IS NOT NULL
    ELSE iati_id IS NOT NULL
  END
);

-- Clean up helper function
DROP FUNCTION IF EXISTS safe_rename_column(TEXT, TEXT, TEXT);

\echo ''
\echo '✅ IATI alignment migration completed!'
\echo ''
\echo 'Next steps:'
\echo '1. Update application code to use new column names'
\echo '2. Test the activities_iati_compliant view'
\echo '3. If there are NULL/duplicate iati_identifiers, fix them before adding constraints' 