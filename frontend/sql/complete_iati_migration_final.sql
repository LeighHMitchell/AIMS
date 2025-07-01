-- Complete IATI Migration - Final Version
-- This handles all cases regardless of current column state

-- Step 1: First diagnose what we have
DO $$
BEGIN
  RAISE NOTICE 'Starting IATI migration...';
  RAISE NOTICE 'Checking current column state...';
END $$;

-- Show current relevant columns
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('iati_id', 'title', 'description', 'tied_status', 'partner_id') THEN 'Old name'
    WHEN column_name IN ('iati_identifier', 'title_narrative', 'description_narrative', 'default_tied_status', 'other_identifier') THEN 'New name'
    ELSE 'Other'
  END as naming_status
FROM information_schema.columns
WHERE table_name = 'activities'
  AND column_name IN (
    'iati_id', 'iati_identifier',
    'title', 'title_narrative',
    'description', 'description_narrative',
    'tied_status', 'default_tied_status',
    'partner_id', 'other_identifier',
    'hierarchy', 'linked_data_uri',
    'activity_status', 'status',
    'activity_date_start', 'start_date', 'date_start',
    'activity_date_end', 'end_date', 'date_end',
    'default_currency', 'currency'
  )
ORDER BY column_name;

-- Step 2: Perform column renames if needed
DO $$
BEGIN
  -- iati_id → iati_identifier
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') THEN
    ALTER TABLE activities RENAME COLUMN iati_id TO iati_identifier;
    RAISE NOTICE 'Renamed iati_id to iati_identifier';
  END IF;
  
  -- title → title_narrative
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title_narrative') THEN
    ALTER TABLE activities RENAME COLUMN title TO title_narrative;
    RAISE NOTICE 'Renamed title to title_narrative';
  END IF;
  
  -- description → description_narrative
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description_narrative') THEN
    ALTER TABLE activities RENAME COLUMN description TO description_narrative;
    RAISE NOTICE 'Renamed description to description_narrative';
  END IF;
  
  -- tied_status → default_tied_status
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'tied_status')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'default_tied_status') THEN
    ALTER TABLE activities RENAME COLUMN tied_status TO default_tied_status;
    RAISE NOTICE 'Renamed tied_status to default_tied_status';
  END IF;
  
  -- partner_id → other_identifier
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'partner_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'other_identifier') THEN
    ALTER TABLE activities RENAME COLUMN partner_id TO other_identifier;
    RAISE NOTICE 'Renamed partner_id to other_identifier';
  END IF;
END $$;

-- Step 3: Add new IATI fields if missing
DO $$
BEGIN
  -- Add hierarchy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'hierarchy') THEN
    ALTER TABLE public.activities ADD COLUMN hierarchy INTEGER DEFAULT 1 CHECK (hierarchy >= 1);
    COMMENT ON COLUMN public.activities.hierarchy IS 'IATI hierarchy level (1=standalone, 2=parent, 3=child)';
    RAISE NOTICE 'Added hierarchy column';
  END IF;
  
  -- Add linked_data_uri
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'linked_data_uri') THEN
    ALTER TABLE public.activities ADD COLUMN linked_data_uri TEXT;
    COMMENT ON COLUMN public.activities.linked_data_uri IS 'Optional URI for linked data representation of this activity';
    RAISE NOTICE 'Added linked_data_uri column';
  END IF;
END $$;

-- Step 4: Add indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'activities' AND indexname = 'idx_activities_reporting_org_id') THEN
    CREATE INDEX idx_activities_reporting_org_id ON public.activities(reporting_org_id);
    RAISE NOTICE 'Added index on reporting_org_id';
  END IF;
END $$;

-- Step 5: Create the flexible view
DO $$
DECLARE
  view_sql TEXT;
  date_start_col TEXT := 'NULL::date';
  date_end_col TEXT := 'NULL::date';
  status_col TEXT := 'NULL::text';
  currency_col TEXT := 'NULL::text';
BEGIN
  -- Find date columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'activity_date_start') THEN
    date_start_col := 'a.activity_date_start';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'start_date') THEN
    date_start_col := 'a.start_date';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'date_start') THEN
    date_start_col := 'a.date_start';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'activity_date_end') THEN
    date_end_col := 'a.activity_date_end';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'end_date') THEN
    date_end_col := 'a.end_date';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'date_end') THEN
    date_end_col := 'a.date_end';
  END IF;
  
  -- Find status column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'activity_status') THEN
    status_col := 'a.activity_status';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'status') THEN
    status_col := 'a.status';
  END IF;
  
  -- Find currency column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'default_currency') THEN
    currency_col := 'a.default_currency';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'currency') THEN
    currency_col := 'a.currency';
  END IF;
  
  -- Build and execute view
  view_sql := format('
    CREATE OR REPLACE VIEW activities_iati_compliant AS
    SELECT
      a.id,
      a.iati_identifier,
      a.title_narrative,
      a.description_narrative,
      o.iati_org_id AS reporting_org_ref,
      o.organisation_type AS reporting_org_type,
      o.name AS reporting_org_name,
      %s as activity_status,
      %s as activity_date_start,
      %s as activity_date_end,
      a.default_tied_status,
      %s as default_currency,
      a.hierarchy,
      a.linked_data_uri,
      a.other_identifier,
      a.created_at,
      a.updated_at
    FROM public.activities a
    LEFT JOIN public.organizations o ON a.reporting_org_id = o.id',
    status_col,
    date_start_col,
    date_end_col,
    currency_col
  );
  
  EXECUTE view_sql;
  RAISE NOTICE 'Created activities_iati_compliant view';
END $$;

-- Step 6: Final report
SELECT 
  'IATI Migration Complete' as status,
  (SELECT COUNT(*) FROM activities) as total_activities,
  (SELECT COUNT(*) FROM activities_iati_compliant) as view_records,
  (SELECT COUNT(DISTINCT column_name) FROM information_schema.columns 
   WHERE table_name = 'activities' 
   AND column_name IN ('iati_identifier', 'title_narrative', 'description_narrative', 
                       'default_tied_status', 'other_identifier', 'hierarchy', 'linked_data_uri')
  ) as iati_compliant_columns;

-- Sample data from view
SELECT * FROM activities_iati_compliant LIMIT 3; 