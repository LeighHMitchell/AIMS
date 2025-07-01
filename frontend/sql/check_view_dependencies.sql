-- Check for views that depend on objectives or target_groups columns
-- Run this before the migration to identify all dependencies

-- Find all views that reference the objectives column
SELECT DISTINCT 
    v.table_schema,
    v.table_name as view_name,
    'objectives' as dependent_column
FROM information_schema.views v
WHERE v.view_definition ILIKE '%objectives%'
  AND v.table_schema = 'public'

UNION ALL

-- Find all views that reference the target_groups column
SELECT DISTINCT 
    v.table_schema,
    v.table_name as view_name,
    'target_groups' as dependent_column
FROM information_schema.views v
WHERE v.view_definition ILIKE '%target_groups%'
  AND v.table_schema = 'public'

UNION ALL

-- Find all views that reference the created_by_org column
SELECT DISTINCT 
    v.table_schema,
    v.table_name as view_name,
    'created_by_org' as dependent_column
FROM information_schema.views v
WHERE v.view_definition ILIKE '%created_by_org%'
  AND v.table_schema = 'public'
  -- Exclude references to the new columns we're adding
  AND v.view_definition NOT ILIKE '%created_by_org_name%'
  AND v.view_definition NOT ILIKE '%created_by_org_acronym%'

ORDER BY view_name, dependent_column; 