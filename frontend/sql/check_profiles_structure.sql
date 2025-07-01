-- Check the structure of profiles table
-- This helps identify the exact column names before running migrations

-- 1. Check if profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as profiles_table_exists;

-- 2. List all columns in profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Show sample data from profiles table
SELECT * FROM profiles LIMIT 5;

-- 4. Count records in profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- 5. Check for any profile columns that might have avatar/picture data
SELECT 
    column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND (column_name LIKE '%avatar%' OR column_name LIKE '%picture%' OR column_name LIKE '%image%' OR column_name LIKE '%photo%'); 