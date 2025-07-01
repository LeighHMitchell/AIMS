-- Check current columns in organizations table
-- This script shows all columns currently in the organizations table

-- 1. Show all columns with their properties
SELECT 
    ordinal_position as "#",
    column_name as "Column Name",
    data_type as "Data Type",
    CASE 
        WHEN character_maximum_length IS NOT NULL 
        THEN '(' || character_maximum_length || ')'
        ELSE ''
    END as "Length",
    is_nullable as "Nullable",
    COALESCE(column_default, '') as "Default"
FROM information_schema.columns
WHERE table_name = 'organizations'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Specifically check for legacy columns
SELECT 
    '=== Legacy Column Check ===' as info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'short_name' 
            AND table_schema = 'public'
        ) THEN '⚠️  YES - Should be removed (use acronym instead)'
        ELSE '✅ NO - Already removed'
    END as "Has short_name column?",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'identifier' 
            AND table_schema = 'public'
        ) THEN '⚠️  YES - Should be removed (use iati_org_id instead)'
        ELSE '✅ NO - Already removed'
    END as "Has identifier column?";

-- 3. Check for the correct columns
SELECT 
    '=== Correct Column Check ===' as info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'acronym' 
            AND table_schema = 'public'
        ) THEN '✅ YES - Correct column for short names'
        ELSE '❌ NO - Missing! This column should exist'
    END as "Has acronym column?",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'iati_org_id' 
            AND table_schema = 'public'
        ) THEN '✅ YES - Correct column for IATI identifiers'
        ELSE '❌ NO - Missing! This column should exist'
    END as "Has iati_org_id column?"; 