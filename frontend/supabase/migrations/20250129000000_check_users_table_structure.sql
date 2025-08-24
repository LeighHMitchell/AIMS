-- Check users table structure before running the contributor name fix
-- This migration helps diagnose what columns are available

-- 1. Check what columns exist in the users table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if specific columns exist that we might need
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') as has_first_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') as has_last_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') as has_email,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') as has_role;

-- 3. Show sample user data (without sensitive information)
SELECT 
  id,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') 
    THEN first_name ELSE 'Column not found' END as first_name,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') 
    THEN last_name ELSE 'Column not found' END as last_name,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') 
    THEN email ELSE 'Column not found' END as email,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') 
    THEN role ELSE 'Column not found' END as role
FROM users 
LIMIT 5;

-- 4. Check if there are any contributors that need fixing
SELECT 
  COUNT(*) as total_contributors,
  COUNT(CASE WHEN nominated_by_name = 'Unknown User' THEN 1 END) as unknown_users,
  COUNT(CASE WHEN nominated_by_name IS NULL THEN 1 END) as null_names,
  COUNT(CASE WHEN nominated_by_name NOT IN ('Unknown User', NULL) THEN 1 END) as known_names
FROM activity_contributors;
