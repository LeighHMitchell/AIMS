-- Fix RLS policies for activities table to allow public read access
-- This migration ensures that the anon key can read activities

-- Enable RLS on activities table if not already enabled
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to activities" ON activities;
DROP POLICY IF EXISTS "Allow authenticated read access to activities" ON activities;

-- Create policy to allow public read access to activities
-- This allows the anon key to read activities for the dashboard
CREATE POLICY "Allow public read access to activities" ON activities
    FOR SELECT
    USING (true);

-- Optional: Allow authenticated users to modify activities
-- CREATE POLICY "Allow authenticated users to modify activities" ON activities
--     FOR ALL
--     USING (auth.role() = 'authenticated')
--     WITH CHECK (auth.role() = 'authenticated');

-- Refresh the materialized view to ensure it's up to date
REFRESH MATERIALIZED VIEW CONCURRENTLY activity_transaction_summary;