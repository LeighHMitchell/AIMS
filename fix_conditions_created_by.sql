-- ============================================================================
-- FIX: Make created_by Nullable for Activity Conditions
-- ============================================================================
-- This fixes the 401/RLS error when saving conditions
-- Root cause: App uses custom auth (not Supabase Auth), so created_by 
-- cannot be populated from supabase.auth.getUser()
--
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================================

-- Make created_by nullable
ALTER TABLE activity_conditions 
ALTER COLUMN created_by DROP NOT NULL;

-- Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'activity_conditions' 
  AND column_name = 'created_by';

-- Expected result: is_nullable = 'YES'

