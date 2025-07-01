-- Check all dependencies on the users.name column before migration
-- Run this to see what objects depend on the name column

-- Check views that use the name column
SELECT DISTINCT 
  'VIEW' as object_type,
  v.table_name as object_name,
  'Uses users.name column' as dependency_type
FROM information_schema.view_column_usage vcu
JOIN information_schema.views v ON v.table_name = vcu.view_name
WHERE vcu.table_name = 'users' 
AND vcu.column_name = 'name'
ORDER BY v.table_name;

-- Check the definition of person_unified_view
SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_name = 'person_unified_view';

-- Check functions that might reference users.name
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE prosrc LIKE '%users%' 
AND prosrc LIKE '%name%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check triggers that might use the name column
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Check constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users';

-- Summary of what needs to be updated
SELECT 
  'Before running the migration, the following objects depend on users.name:' as message
UNION ALL
SELECT 
  '- ' || COUNT(*) || ' view(s)' as message
FROM information_schema.view_column_usage vcu
WHERE vcu.table_name = 'users' 
AND vcu.column_name = 'name'; 