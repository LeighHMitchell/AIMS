-- Check Database Status
-- This script checks the current state of various tables and columns

-- 1. Check if full_name column exists in various tables
SELECT 
    'Organizations' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'full_name'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as has_full_name_column,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'name'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as has_name_column
UNION ALL
SELECT 
    'Profiles' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'full_name'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as has_full_name_column,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'name'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as has_name_column
UNION ALL
SELECT 
    'Rolodex Persons' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'rolodex_persons' 
            AND column_name = 'full_name'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as has_full_name_column,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'rolodex_persons' 
            AND column_name = 'name'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as has_name_column;

-- 2. Check if Data Clinic columns exist
SELECT 
    'Data Clinic - Activities' as feature,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'activities' 
            AND column_name = 'iati_identifier'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO - Run add_data_clinic_fields.sql' 
    END as iati_identifier_exists;

-- 3. Check if change_log table exists
SELECT 
    'Change Log Table' as feature,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'change_log'
            AND table_schema = 'public'
        ) THEN 'YES' 
        ELSE 'NO' 
    END as exists;

-- 4. Check if backup tables exist
SELECT 
    'Backup Tables' as feature,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'organizations_backup_fullname'
            AND table_schema = 'public'
        ) THEN 'YES - Migration may have been attempted' 
        ELSE 'NO - No migration backup found' 
    END as status;

-- 5. Sample organization data to see current state
SELECT 
    'Sample Organizations (first 5)' as info;
    
SELECT 
    id,
    CASE WHEN name IS NOT NULL AND name != '' THEN name ELSE 'NULL/EMPTY' END as name_value,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'full_name'
            AND table_schema = 'public'
        ) THEN 
            CASE WHEN full_name IS NOT NULL AND full_name != '' THEN full_name ELSE 'NULL/EMPTY' END
        ELSE 'COLUMN NOT EXISTS'
    END as full_name_value
FROM organizations
LIMIT 5; 