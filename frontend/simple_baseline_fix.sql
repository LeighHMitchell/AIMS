-- Simple baseline fix - just ensure the table is properly set up

-- 1. First, let's check and create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS indicator_baselines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id uuid NOT NULL REFERENCES result_indicators(id) ON DELETE CASCADE,
  baseline_year integer,
  iso_date date,
  value numeric,
  comment text,
  location_ref text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Drop all existing constraints on indicator_id to start fresh
ALTER TABLE indicator_baselines 
DROP CONSTRAINT IF EXISTS indicator_baselines_indicator_id_key,
DROP CONSTRAINT IF EXISTS indicator_baselines_indicator_id_unique,
DROP CONSTRAINT IF EXISTS indicator_baselines_indicator_id_fkey;

-- 3. Re-add the foreign key constraint
ALTER TABLE indicator_baselines
ADD CONSTRAINT indicator_baselines_indicator_id_fkey 
FOREIGN KEY (indicator_id) REFERENCES result_indicators(id) ON DELETE CASCADE;

-- 4. Add unique constraint for indicator_id
ALTER TABLE indicator_baselines
ADD CONSTRAINT indicator_baselines_indicator_id_unique UNIQUE (indicator_id);

-- 5. Disable RLS temporarily to test
ALTER TABLE indicator_baselines DISABLE ROW LEVEL SECURITY;

-- 6. Drop all existing policies
DROP POLICY IF EXISTS "Users can manage baselines for their indicators" ON indicator_baselines;
DROP POLICY IF EXISTS "Allow all authenticated users to manage baselines" ON indicator_baselines;

-- 7. Create a simple permissive policy for testing
ALTER TABLE indicator_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users"
ON indicator_baselines
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 8. Grant necessary permissions
GRANT ALL ON indicator_baselines TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
