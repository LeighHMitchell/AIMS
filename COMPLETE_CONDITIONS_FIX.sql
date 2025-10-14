-- ============================================================================
-- COMPLETE FIX for Activity Conditions (Run ALL of this)
-- ============================================================================
-- This fixes BOTH the created_by issue AND the RLS policies
-- Run this ENTIRE script in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================================

-- STEP 1: Make created_by nullable
ALTER TABLE activity_conditions 
ALTER COLUMN created_by DROP NOT NULL;

-- STEP 2: Fix RLS policies to be permissive
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read conditions" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to insert conditions for activities they can edit" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to update conditions for activities they can edit" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to delete conditions for activities they can edit" ON activity_conditions;

-- Create new permissive policies
CREATE POLICY "Allow authenticated users to read conditions"
  ON activity_conditions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert conditions"
  ON activity_conditions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update conditions"
  ON activity_conditions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete conditions"
  ON activity_conditions
  FOR DELETE
  TO authenticated
  USING (true);

-- STEP 3: Verify everything is set up correctly
SELECT 
  'created_by nullable check' as test,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_conditions' 
  AND column_name = 'created_by'

UNION ALL

SELECT 
  'RLS policies check' as test,
  policyname as column_name,
  cmd::text as is_nullable
FROM pg_policies 
WHERE tablename = 'activity_conditions'
ORDER BY test, column_name;

-- Expected results:
-- created_by should show is_nullable = 'YES'
-- You should see 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)

