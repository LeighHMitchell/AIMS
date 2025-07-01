-- Check Full Name Migration Status
-- This script checks if the full_name to name migration has been completed

-- 1. Check if full_name column still exists
SELECT 
    '1. Column Status' as check_type,
    table_name,
    column_name,
    CASE 
        WHEN column_name = 'full_name' THEN '❌ Still exists - migration not complete'
        ELSE '✅ Column found'
    END as status
FROM information_schema.columns
WHERE table_name = 'organizations' 
    AND column_name IN ('name', 'full_name')
    AND table_schema = 'public'
ORDER BY column_name;

-- 2. Check for empty names that might need migration
SELECT 
    '2. Empty Names Check' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️  Organizations with empty names found'
        ELSE '✅ All organizations have names'
    END as status
FROM organizations
WHERE name IS NULL OR name = '';

-- 3. If full_name exists, check if any values differ from name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'full_name'
    ) THEN
        RAISE NOTICE '';
        RAISE NOTICE '3. Data Comparison (full_name still exists):';
        
        -- Count organizations where full_name differs from name
        PERFORM COUNT(*) 
        FROM organizations 
        WHERE full_name IS NOT NULL 
        AND full_name != '' 
        AND (name IS NULL OR name = '' OR name != full_name);
        
        IF FOUND THEN
            RAISE NOTICE '   ⚠️  Found organizations where full_name differs from name';
        ELSE
            RAISE NOTICE '   ✅ All full_name values match name values';
        END IF;
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '3. Data Comparison:';
        RAISE NOTICE '   ✅ full_name column has been dropped - migration complete!';
    END IF;
END $$;

-- 4. Sample data
SELECT 
    '4. Sample Data' as check_type,
    id,
    name,
    acronym,
    CASE 
        WHEN name IS NULL OR name = '' THEN '❌ Empty'
        ELSE '✅ Has name'
    END as name_status
FROM organizations
LIMIT 5;

-- 5. Summary
SELECT 
    '5. MIGRATION STATUS' as check_type,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' AND column_name = 'full_name'
        ) THEN '⏳ INCOMPLETE - full_name column still exists. Run drop_full_name_column.sql'
        ELSE '✅ COMPLETE - full_name column has been removed!'
    END as status; 