-- Complete IATI Migration
-- This script completes any remaining steps and fixes the view

-- Step 1: Add any missing fields
DO $$
BEGIN
  -- Add hierarchy if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'hierarchy'
  ) THEN
    ALTER TABLE public.activities 
    ADD COLUMN hierarchy INTEGER DEFAULT 1 CHECK (hierarchy >= 1);
    COMMENT ON COLUMN public.activities.hierarchy IS 'IATI hierarchy level (1=standalone, 2=parent, 3=child)';
  END IF;

  -- Add linked_data_uri if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'linked_data_uri'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN linked_data_uri TEXT;
    COMMENT ON COLUMN public.activities.linked_data_uri IS 'Optional URI for linked data representation of this activity';
  END IF;
END $$;

-- Step 2: Add indexes if missing
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

-- Step 3: Fix the view (handles already renamed columns)
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
LEFT JOIN public.organizations o ON a.reporting_org_id = o.id;

COMMENT ON VIEW activities_iati_compliant IS 'IATI-compliant view of activities with normalized field names';

-- Step 4: Verify everything is complete
SELECT 'IATI Migration Complete!' as status,
  (SELECT COUNT(*) FROM activities_iati_compliant) as total_activities,
  (SELECT COUNT(*) FROM activities WHERE reporting_org_id IS NOT NULL) as activities_with_reporting_org; 