-- Check what columns currently exist in the activities table
-- Run this to see the current schema before migration

SELECT 
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'activities'
ORDER BY ordinal_position;

-- Check specifically for columns we're modifying
SELECT 
    column_name,
    CASE 
        WHEN column_name = 'objectives' THEN 'Will be REMOVED'
        WHEN column_name = 'target_groups' THEN 'Will be REMOVED'
        WHEN column_name = 'created_by_org' THEN 'Will be RENAMED to reporting_org_id'
        WHEN column_name = 'reporting_org_id' THEN 'Already exists (no rename needed)'
        WHEN column_name = 'created_by_org_name' THEN 'Already exists (no add needed)'
        WHEN column_name = 'created_by_org_acronym' THEN 'Already exists (no add needed)'
        ELSE 'No change'
    END as migration_action
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'activities'
  AND column_name IN ('objectives', 'target_groups', 'created_by_org', 'reporting_org_id', 'created_by_org_name', 'created_by_org_acronym')
ORDER BY column_name;
