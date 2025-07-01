-- Fix the activities_iati_compliant view after column renames
-- This handles the case where columns have already been renamed

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

-- Verify the view works
SELECT COUNT(*) as record_count FROM activities_iati_compliant; 