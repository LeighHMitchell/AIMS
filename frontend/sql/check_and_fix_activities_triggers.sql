-- 1. First, let's see ALL triggers on activities table (excluding foreign key constraints)
SELECT DISTINCT
    t.tgname AS trigger_name,
    CASE t.tgtype
        WHEN 1 THEN 'BEFORE'
        WHEN 2 THEN 'AFTER'
        WHEN 66 THEN 'INSTEAD OF'
        ELSE 'UNKNOWN'
    END AS timing,
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        WHEN t.tgtype & 32 = 32 THEN 'TRUNCATE'
        ELSE 'UNKNOWN'
    END AS event,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'activities' 
AND n.nspname = 'public'
AND t.tgname NOT LIKE 'RI_ConstraintTrigger%'
ORDER BY t.tgname;

-- 2. Search for any functions that contain 'updated_by'
SELECT 
    routine_schema,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%updated_by%'
AND routine_definition ILIKE '%activities%'
AND routine_schema = 'public';

-- 3. Check if there's a rule on activities table
SELECT 
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules
WHERE tablename = 'activities'
AND schemaname = 'public';

-- 4. Look for any policies that might reference updated_by
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'activities'
AND schemaname = 'public'
AND (qual::text ILIKE '%updated_by%' OR with_check::text ILIKE '%updated_by%');

-- 5. Quick fix - if the issue is in the update trigger, here's a likely fix:
-- This will show us what needs to be fixed
SELECT 
    'The trigger function ' || p.proname || ' references NEW.updated_by but activities table uses last_edited_by' as issue,
    'Run: CREATE OR REPLACE FUNCTION ' || p.proname || '() with NEW.last_edited_by instead of NEW.updated_by' as solution
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'activities'::regclass
AND pg_get_functiondef(p.oid) LIKE '%NEW.updated_by%';

-- 6. Alternative approach - check the actual error by looking at triggers that fire on UPDATE
SELECT 
    tgname,
    pg_get_triggerdef(oid) as full_definition
FROM pg_trigger
WHERE tgrelid = 'activities'::regclass
AND tgtype & 16 = 16  -- UPDATE triggers
AND tgname NOT LIKE 'RI_%'; 