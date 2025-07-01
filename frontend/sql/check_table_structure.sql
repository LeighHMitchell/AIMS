-- Simple script to check current table structures
-- Run this first to understand what columns exist

-- 1. Check activities table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activities'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check transactions table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 4. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('activities', 'transactions');

-- 5. Check for any recent activities
SELECT COUNT(*) as total_activities FROM activities;

-- 6. Check for any recent transactions
SELECT COUNT(*) as total_transactions FROM transactions;

-- 7. Try a simple insert test
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Try to insert a minimal activity
    INSERT INTO activities (title, activity_status, publication_status, submission_status)
    VALUES ('TEST - Can be deleted', 'planning', 'draft', 'draft')
    RETURNING id INTO test_id;
    
    RAISE NOTICE 'Successfully created test activity with ID: %', test_id;
    
    -- Clean up
    DELETE FROM activities WHERE id = test_id;
    RAISE NOTICE 'Test activity cleaned up';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$; 