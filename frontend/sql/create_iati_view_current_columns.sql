-- Create IATI-compliant view using current column names
-- This creates the view using whatever column names currently exist

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

-- Test the view
SELECT COUNT(*) as total_records FROM activities_iati_compliant; 