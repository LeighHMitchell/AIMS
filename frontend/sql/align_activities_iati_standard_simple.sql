-- IATI Activities Table Alignment - Simple Version
-- This version contains only the essential SQL commands without psql meta-commands

-- Step 1: Create helper function for safe column rename
CREATE OR REPLACE FUNCTION safe_rename_column(
  p_table_name TEXT,
  p_old_name TEXT,
  p_new_name TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = p_old_name
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = p_new_name
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', p_table_name, p_old_name, p_new_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Rename columns
SELECT safe_rename_column('activities', 'iati_id', 'iati_identifier');
SELECT safe_rename_column('activities', 'title', 'title_narrative');
SELECT safe_rename_column('activities', 'description', 'description_narrative');
SELECT safe_rename_column('activities', 'tied_status', 'default_tied_status');
SELECT safe_rename_column('activities', 'partner_id', 'other_identifier');

-- Step 3: Add new IATI fields
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
  END IF;
END $$;

-- Step 4: Add unique constraint on iati_identifier (if no issues)
DO $$
DECLARE
  identifier_column TEXT;
  has_issues BOOLEAN := FALSE;
BEGIN
  -- Determine which column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'iati_identifier'
  ) THEN
    identifier_column := 'iati_identifier';
  ELSE
    identifier_column := 'iati_id';
  END IF;
  
  -- Check for NULL or duplicate values
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM activities WHERE %I IS NULL)', identifier_column) INTO has_issues;
  
  IF NOT has_issues THEN
    EXECUTE format('
      SELECT EXISTS(
        SELECT 1 FROM activities 
        WHERE %I IS NOT NULL 
        GROUP BY %I 
        HAVING COUNT(*) > 1
      )', identifier_column, identifier_column) INTO has_issues;
  END IF;
  
  -- Add constraint if no issues
  IF NOT has_issues AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_iati_identifier'
  ) THEN
    EXECUTE format('ALTER TABLE public.activities ADD CONSTRAINT unique_iati_identifier UNIQUE (%I)', identifier_column);
  END IF;
END $$;

-- Step 5: Add index on reporting_org_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'activities' 
    AND indexname = 'idx_activities_reporting_org_id'
  ) THEN
    CREATE INDEX idx_activities_reporting_org_id ON public.activities(reporting_org_id);
  END IF;
END $$;

-- Step 6: Create IATI-compliant view
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

-- Step 7: Clean up
DROP FUNCTION IF EXISTS safe_rename_column(TEXT, TEXT, TEXT); 