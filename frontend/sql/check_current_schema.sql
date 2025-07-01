-- Check current activity_sectors table structure
-- Run this in Supabase SQL Editor to see what columns exist NOW

-- 1. Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'activity_sectors'
) as table_exists;

-- 2. Show current columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- 3. Check for the specific columns we need
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sectors' AND column_name = 'sector_category_code') 
         THEN '✅ sector_category_code exists' 
         ELSE '❌ sector_category_code MISSING' END as category_code_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sectors' AND column_name = 'sector_category_name') 
         THEN '✅ sector_category_name exists' 
         ELSE '❌ sector_category_name MISSING' END as category_name_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sectors' AND column_name = 'category_percentage') 
         THEN '✅ category_percentage exists' 
         ELSE '❌ category_percentage MISSING' END as category_percentage_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sectors' AND column_name = 'sector_percentage') 
         THEN '✅ sector_percentage exists' 
         ELSE '❌ sector_percentage MISSING' END as sector_percentage_check; 