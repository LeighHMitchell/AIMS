-- Add reporting_org_iati_id column to activities table
-- This stores the IATI organization ID from the XML when importing as original publisher

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activities' 
    AND column_name = 'reporting_org_iati_id'
  ) THEN
    ALTER TABLE public.activities 
    ADD COLUMN reporting_org_iati_id TEXT;
    
    COMMENT ON COLUMN public.activities.reporting_org_iati_id IS 'IATI organization ID from XML when imported as original publisher. This is the reporting-org/@ref value from the IATI XML.';
    
    RAISE NOTICE '✅ Added reporting_org_iati_id column to activities table';
  ELSE
    RAISE NOTICE '✓ reporting_org_iati_id column already exists';
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activities_reporting_org_iati_id 
ON public.activities(reporting_org_iati_id) 
WHERE reporting_org_iati_id IS NOT NULL;

COMMENT ON INDEX idx_activities_reporting_org_iati_id IS 'Index for looking up activities by reporting organization IATI ID';

