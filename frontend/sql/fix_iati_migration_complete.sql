-- Fix and Complete IATI Migration
-- This script handles the case where column renames didn't work properly

-- Step 1: First, check what columns we actually have
DO $$
DECLARE
  has_old_columns BOOLEAN;
  has_new_columns BOOLEAN;
BEGIN
  -- Check for old column names
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_id') INTO has_old_columns;
  
  -- Check for new column names
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') INTO has_new_columns;
  
  IF has_old_columns AND NOT has_new_columns THEN
    RAISE NOTICE 'Columns have NOT been renamed yet. Performing renames now...';
  ELSIF has_new_columns AND NOT has_old_columns THEN
    RAISE NOTICE 'Columns have already been renamed. Skipping renames...';
  ELSE
    RAISE NOTICE 'Mixed state detected. Will handle appropriately...';
  END IF;
END $$;

-- Step 2: Perform column renames (only if needed)
-- Using PERFORM to actually execute the function
DO $$
BEGIN
  -- Create the rename function if it doesn't exist
  CREATE OR REPLACE FUNCTION safe_rename_column(
    p_table_name TEXT,
    p_old_name TEXT,
    p_new_name TEXT
  ) RETURNS VOID AS $func$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = p_table_name AND column_name = p_old_name
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = p_table_name AND column_name = p_new_name
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', p_table_name, p_old_name, p_new_name);
      RAISE NOTICE 'Renamed % to %', p_old_name, p_new_name;
    END IF;
  END;
  $func$ LANGUAGE plpgsql;
  
  -- Now actually perform the renames
  PERFORM safe_rename_column('activities', 'iati_id', 'iati_identifier');
  PERFORM safe_rename_column('activities', 'title', 'title_narrative');
  PERFORM safe_rename_column('activities', 'description', 'description_narrative');
  PERFORM safe_rename_column('activities', 'tied_status', 'default_tied_status');
  PERFORM safe_rename_column('activities', 'partner_id', 'other_identifier');
END $$;

-- Step 3: Add new IATI fields (if missing)
DO $$
BEGIN
  -- Add hierarchy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'hierarchy'
  ) THEN
    ALTER TABLE public.activities 
    ADD COLUMN hierarchy INTEGER DEFAULT 1 CHECK (hierarchy >= 1);
    COMMENT ON COLUMN public.activities.hierarchy IS 'IATI hierarchy level (1=standalone, 2=parent, 3=child)';
    RAISE NOTICE 'Added hierarchy column';
  END IF;

  -- Add linked_data_uri
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'linked_data_uri'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN linked_data_uri TEXT;
    COMMENT ON COLUMN public.activities.linked_data_uri IS 'Optional URI for linked data representation of this activity';
    RAISE NOTICE 'Added linked_data_uri column';
  END IF;
END $$;

-- Step 4: Add index if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'activities' 
    AND indexname = 'idx_activities_reporting_org_id'
  ) THEN
    CREATE INDEX idx_activities_reporting_org_id ON public.activities(reporting_org_id);
    RAISE NOTICE 'Added index on reporting_org_id';
  END IF;
END $$;

-- Step 5: Create the view with proper column names
-- This version checks which columns actually exist
DO $$
DECLARE
  view_sql TEXT;
BEGIN
  -- Build the view SQL based on actual column names
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') THEN
    -- New column names exist
    view_sql := '
      CREATE OR REPLACE VIEW activities_iati_compliant AS
      SELECT
        a.id,
        a.iati_identifier,
        a.title_narrative,
        a.description_narrative,
        o.iati_org_id AS reporting_org_ref,
        o.organisation_type AS reporting_org_type,
        o.name AS reporting_org_name,
        a.activity_status,
        a.activity_date_start,
        a.activity_date_end,
        a.default_tied_status,
        a.default_currency,
        a.hierarchy,
        a.linked_data_uri,
        a.other_identifier,
        a.created_at,
        a.updated_at
      FROM public.activities a
      LEFT JOIN public.organizations o ON a.reporting_org_id = o.id';
  ELSE
    -- Old column names still exist
    view_sql := '
      CREATE OR REPLACE VIEW activities_iati_compliant AS
      SELECT
        a.id,
        a.iati_id as iati_identifier,
        a.title as title_narrative,
        a.description as description_narrative,
        o.iati_org_id AS reporting_org_ref,
        o.organisation_type AS reporting_org_type,
        o.name AS reporting_org_name,
        a.activity_status,
        a.activity_date_start,
        a.activity_date_end,
        a.tied_status as default_tied_status,
        a.default_currency,
        a.hierarchy,
        a.linked_data_uri,
        a.partner_id as other_identifier,
        a.created_at,
        a.updated_at
      FROM public.activities a
      LEFT JOIN public.organizations o ON a.reporting_org_id = o.id';
  END IF;
  
  EXECUTE view_sql;
  RAISE NOTICE 'Created/updated activities_iati_compliant view';
END $$;

-- Step 6: Clean up
DROP FUNCTION IF EXISTS safe_rename_column(TEXT, TEXT, TEXT);

-- Step 7: Final verification
SELECT 
  'Migration Status' as info,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') 
       THEN 'COMPLETE' ELSE 'PENDING' END as column_renames,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'hierarchy') 
       THEN 'ADDED' ELSE 'MISSING' END as new_fields,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'activities_iati_compliant') 
       THEN 'CREATED' ELSE 'MISSING' END as view_status,
  (SELECT COUNT(*) FROM activities) as total_activities;

-- Show sample from view
SELECT * FROM activities_iati_compliant LIMIT 3; 