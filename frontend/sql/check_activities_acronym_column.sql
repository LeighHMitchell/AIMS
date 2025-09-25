-- Check if the acronym column exists in the activities table
-- Run this to verify the migration has been applied

-- 1. Check if acronym column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activities' 
            AND column_name = 'acronym'
            AND table_schema = 'public'
        ) THEN '✅ YES - acronym column exists'
        ELSE '❌ NO - acronym column is missing!'
    END as "Acronym Column Status";

-- 2. Show all columns containing 'acronym' in activities table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'activities'
  AND column_name LIKE '%acronym%'
ORDER BY column_name;

-- 3. Count activities with acronym values
DO $$ 
DECLARE
    acronym_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'acronym'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Acronym column exists - checking values...';
        
        SELECT COUNT(*) INTO acronym_count
        FROM activities 
        WHERE acronym IS NOT NULL 
        AND acronym != '';
        
        RAISE NOTICE 'Total activities with acronym: %', acronym_count;
    ELSE
        RAISE NOTICE '❌ acronym column does not exist - migration needed!';
    END IF;
END $$;

-- 4. Show recent activities to check data
SELECT 
    id,
    title_narrative,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activities' 
            AND column_name = 'acronym'
            AND table_schema = 'public'
        ) THEN 
            COALESCE(acronym, 'NULL') 
        ELSE 'COLUMN_MISSING'
    END as acronym_value,
    created_at,
    updated_at
FROM activities 
ORDER BY updated_at DESC 
LIMIT 10;


