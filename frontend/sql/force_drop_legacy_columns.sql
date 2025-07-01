-- Force drop legacy columns from organizations table
-- This script checks for dependencies and drops them forcefully

-- Step 1: Check for any views that might be using these columns
SELECT 
    'Checking for dependent views...' as status;

SELECT DISTINCT
    v.table_schema as schema,
    v.table_name as view_name,
    'Uses column: ' || vcu.column_name as dependency
FROM information_schema.views v
JOIN information_schema.view_column_usage vcu 
    ON v.table_schema = vcu.view_schema 
    AND v.table_name = vcu.view_name
WHERE vcu.table_name = 'organizations'
AND vcu.column_name IN ('short_name', 'identifier')
AND v.table_schema = 'public';

-- Step 2: Drop any dependent views (you may need to recreate them later)
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Find and drop views that reference these columns
    FOR view_record IN 
        SELECT DISTINCT 
            v.table_schema,
            v.table_name
        FROM information_schema.views v
        JOIN information_schema.view_column_usage vcu 
            ON v.table_schema = vcu.view_schema 
            AND v.table_name = vcu.view_name
        WHERE vcu.table_name = 'organizations'
        AND vcu.column_name IN ('short_name', 'identifier')
        AND v.table_schema = 'public'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.table_schema, view_record.table_name);
        RAISE NOTICE 'Dropped view %.%', view_record.table_schema, view_record.table_name;
    END LOOP;
END $$;

-- Step 3: Check for any constraints
SELECT 
    'Checking for constraints...' as status;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
AND pg_get_constraintdef(oid) LIKE '%short_name%'
   OR pg_get_constraintdef(oid) LIKE '%identifier%';

-- Step 4: Force drop the columns with CASCADE
-- This will drop any dependent objects
BEGIN;

-- Drop short_name column
ALTER TABLE organizations DROP COLUMN IF EXISTS short_name CASCADE;

-- Drop identifier column  
ALTER TABLE organizations DROP COLUMN IF EXISTS identifier CASCADE;

COMMIT;

-- Step 5: Verify the columns are gone
SELECT 
    'Final column check:' as status;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('short_name', 'identifier') THEN '❌ STILL EXISTS!'
        WHEN column_name = 'acronym' THEN '✅ Correct replacement for short_name'
        WHEN column_name = 'iati_org_id' THEN '✅ Correct replacement for identifier'
        ELSE '✓'
    END as status
FROM information_schema.columns
WHERE table_name = 'organizations'
AND table_schema = 'public'
ORDER BY ordinal_position; 