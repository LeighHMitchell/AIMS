-- Check RLS policies on organizations table
-- This helps identify if Row Level Security is blocking updates

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'organizations';

-- View all policies on organizations table
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
WHERE tablename = 'organizations'
ORDER BY policyname;

-- If RLS is blocking updates, you may need to add a policy like:
-- CREATE POLICY "Users can update their organization" ON organizations
--     FOR UPDATE 
--     USING (true)
--     WITH CHECK (true);











