-- Diagnostic script to check conditions table and auth
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Check if table exists and structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_conditions'
ORDER BY ordinal_position;

-- 2. Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'activity_conditions';

-- 3. Check all policies
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
WHERE tablename = 'activity_conditions';

-- 4. Test if you can insert (run as authenticated user)
-- This will fail if RLS is blocking, but shows the exact error
SELECT auth.uid() AS current_user_id;

-- 5. Check if activities table exists (foreign key dependency)
SELECT COUNT(*) as activity_count FROM activities;

