-- Check the current status of IATI migration
-- This helps determine what has been completed and what remains

-- 1. Check which columns exist
SELECT 
  'Column Status' as check_type,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('iati_identifier', 'title_narrative', 'description_narrative', 'default_tied_status', 'other_identifier', 'hierarchy', 'linked_data_uri') 
    THEN '✓ IATI compliant'
    WHEN column_name IN ('iati_id', 'title', 'description', 'tied_status', 'partner_id')
    THEN '⚠️ Old name (needs rename)'
    ELSE '- Standard field'
  END as status
FROM information_schema.columns
WHERE table_name = 'activities'
  AND (
    column_name IN ('iati_id', 'iati_identifier', 'title', 'title_narrative', 
                    'description', 'description_narrative', 'tied_status', 
                    'default_tied_status', 'partner_id', 'other_identifier',
                    'hierarchy', 'linked_data_uri', 'reporting_org_id')
  )
ORDER BY 
  CASE 
    WHEN column_name IN ('iati_identifier', 'title_narrative', 'description_narrative', 'default_tied_status', 'other_identifier') 
    THEN 1
    ELSE 2 
  END,
  column_name;

-- 2. Check constraints
SELECT 
  'Constraints' as check_type,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'activities'
  AND constraint_name IN ('unique_iati_identifier', 'fk_reporting_org_id');

-- 3. Check indexes
SELECT 
  'Indexes' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'activities'
  AND indexname LIKE '%reporting_org%';

-- 4. Check if view exists
SELECT 
  'View Status' as check_type,
  table_name as view_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✓ Exists'
    ELSE '✗ Not found'
  END as status
FROM information_schema.views
WHERE table_name = 'activities_iati_compliant';

-- 5. Summary
SELECT 
  'Migration Summary' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier')
    THEN '✓ Column renames: COMPLETE'
    ELSE '⚠️ Column renames: PENDING'
  END as column_renames,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'hierarchy')
    THEN '✓ New fields: ADDED'
    ELSE '⚠️ New fields: PENDING'
  END as new_fields,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'activities_iati_compliant')
    THEN '✓ View: CREATED'
    ELSE '⚠️ View: PENDING'
  END as view_status; 