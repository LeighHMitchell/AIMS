-- Create IATI-compliant view with flexible column mapping
-- This script adapts to whatever columns actually exist

DO $$
DECLARE
  view_sql TEXT;
  date_start_col TEXT;
  date_end_col TEXT;
  status_col TEXT;
  currency_col TEXT;
BEGIN
  -- Determine which date columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'activity_date_start') THEN
    date_start_col := 'a.activity_date_start';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'start_date') THEN
    date_start_col := 'a.start_date';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'date_start') THEN
    date_start_col := 'a.date_start';
  ELSE
    date_start_col := 'NULL::date';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'activity_date_end') THEN
    date_end_col := 'a.activity_date_end';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'end_date') THEN
    date_end_col := 'a.end_date';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'date_end') THEN
    date_end_col := 'a.date_end';
  ELSE
    date_end_col := 'NULL::date';
  END IF;
  
  -- Check for status column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'activity_status') THEN
    status_col := 'a.activity_status';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'status') THEN
    status_col := 'a.status';
  ELSE
    status_col := 'NULL::text';
  END IF;
  
  -- Check for currency column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'default_currency') THEN
    currency_col := 'a.default_currency';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'currency') THEN
    currency_col := 'a.currency';
  ELSE
    currency_col := 'NULL::text';
  END IF;
  
  -- Build the view SQL based on what columns exist
  view_sql := format('
    CREATE OR REPLACE VIEW activities_iati_compliant AS
    SELECT
      a.id,
      %s as iati_identifier,
      %s as title_narrative,
      %s as description_narrative,
      o.iati_org_id AS reporting_org_ref,
      o.organisation_type AS reporting_org_type,
      o.name AS reporting_org_name,
      %s as activity_status,
      %s as activity_date_start,
      %s as activity_date_end,
      %s as default_tied_status,
      %s as default_currency,
      %s as hierarchy,
      %s as linked_data_uri,
      %s as other_identifier,
      a.created_at,
      a.updated_at
    FROM public.activities a
    LEFT JOIN public.organizations o ON a.reporting_org_id = o.id',
    -- Column mappings
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') 
         THEN 'a.iati_identifier' 
         ELSE 'a.iati_id' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title_narrative') 
         THEN 'a.title_narrative' 
         ELSE 'a.title' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description_narrative') 
         THEN 'a.description_narrative' 
         ELSE 'a.description' END,
    status_col,
    date_start_col,
    date_end_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'default_tied_status') 
         THEN 'a.default_tied_status' 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'tied_status')
         THEN 'a.tied_status'
         ELSE 'NULL::text' END,
    currency_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'hierarchy') 
         THEN 'a.hierarchy' 
         ELSE '1' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'linked_data_uri') 
         THEN 'a.linked_data_uri' 
         ELSE 'NULL::text' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'other_identifier') 
         THEN 'a.other_identifier' 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'partner_id')
         THEN 'a.partner_id'
         ELSE 'NULL::text' END
  );
  
  -- Execute the dynamic SQL
  EXECUTE view_sql;
  RAISE NOTICE 'Successfully created activities_iati_compliant view';
END $$;

-- Show what columns were mapped
SELECT 
  'Column Mapping Report' as report,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') 
       THEN 'iati_identifier → iati_identifier' 
       ELSE 'iati_id → iati_identifier' END as identifier_mapping,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title_narrative') 
       THEN 'title_narrative → title_narrative' 
       ELSE 'title → title_narrative' END as title_mapping,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'activity_date_start') 
       THEN 'activity_date_start exists' 
       WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'start_date')
       THEN 'start_date → activity_date_start'
       ELSE 'No date columns found' END as date_mapping;

-- Test the view
SELECT COUNT(*) as total_records FROM activities_iati_compliant; 