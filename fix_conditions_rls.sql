-- Fix RLS policies for activity_conditions table
-- Run this in Supabase Dashboard > SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read conditions" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to insert conditions for activities they can edit" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to update conditions for activities they can edit" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to delete conditions for activities they can edit" ON activity_conditions;

-- Create permissive policies for authenticated users
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

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'activity_conditions';

