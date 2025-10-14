-- ================================================================
-- CHECK PLANNED DISBURSEMENTS SCHEMA
-- ================================================================
-- Run this to see if you need to run the migration
-- ================================================================

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'planned_disbursements'
ORDER BY ordinal_position;

-- Check if the IATI columns exist
SELECT 
  COUNT(*) FILTER (WHERE column_name = 'type') as has_type,
  COUNT(*) FILTER (WHERE column_name = 'provider_org_ref') as has_provider_org_ref,
  COUNT(*) FILTER (WHERE column_name = 'provider_org_type') as has_provider_org_type,
  COUNT(*) FILTER (WHERE column_name = 'provider_activity_id') as has_provider_activity_id,
  COUNT(*) FILTER (WHERE column_name = 'receiver_org_ref') as has_receiver_org_ref,
  COUNT(*) FILTER (WHERE column_name = 'receiver_org_type') as has_receiver_org_type,
  COUNT(*) FILTER (WHERE column_name = 'receiver_activity_id') as has_receiver_activity_id
FROM information_schema.columns
WHERE table_name = 'planned_disbursements';

-- If all values are 1, you're good to go!
-- If any are 0, you need to run the migration
