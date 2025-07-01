-- SQL Script to Diagnose and Fix Data Persistence Issues
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled on key tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('activities', 'transactions', 'activity_sectors', 'activity_contacts');

-- 2. Temporarily disable RLS for testing (re-enable after testing!)
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_contacts DISABLE ROW LEVEL SECURITY;

-- 3. Check for missing columns in activities table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activities'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Add missing columns if needed
DO $$ 
BEGIN
    -- Add icon column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'icon'
    ) THEN
        ALTER TABLE activities ADD COLUMN icon TEXT;
    END IF;

    -- Make partner_id nullable if it isn't
    ALTER TABLE activities ALTER COLUMN partner_id DROP NOT NULL;
    
    -- Make created_by_org nullable if it isn't
    ALTER TABLE activities ALTER COLUMN created_by_org DROP NOT NULL;
    
    -- Make created_by nullable if it isn't
    ALTER TABLE activities ALTER COLUMN created_by DROP NOT NULL;
    
    -- Make last_edited_by nullable if it isn't
    ALTER TABLE activities ALTER COLUMN last_edited_by DROP NOT NULL;

    -- Add default_aid_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_aid_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_aid_type TEXT;
    END IF;

    -- Add flow_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'flow_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN flow_type TEXT;
    END IF;
END $$;

-- 5. Check transactions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Add missing columns to transactions table
DO $$ 
BEGIN
    -- Add uuid column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'uuid'
    ) THEN
        ALTER TABLE transactions ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;

    -- Make organization_id nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE transactions ALTER COLUMN organization_id DROP NOT NULL;
    END IF;
END $$;

-- 7. Check for constraint violations
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
AND conrelid::regclass::text IN ('activities', 'transactions');

-- 8. Create a test user if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        -- Note: This won't work in Supabase, but shows the issue
        RAISE NOTICE 'No users found in auth.users - this may cause foreign key issues';
    END IF;
END $$;

-- 9. Check recent activity saves
SELECT 
    id,
    title,
    created_at,
    updated_at,
    created_by,
    last_edited_by
FROM activities
ORDER BY created_at DESC
LIMIT 10;

-- 10. Check recent transactions
SELECT 
    uuid as transaction_id,
    activity_id,
    transaction_type,
    value,
    currency,
    status,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- 11. Create a simple test to verify inserts work
DO $$
DECLARE
    test_activity_id UUID;
    test_transaction_id UUID;
BEGIN
    -- Try to insert a test activity
    INSERT INTO activities (
        title,
        description,
        activity_status,
        publication_status,
        submission_status
    ) VALUES (
        'TEST ACTIVITY - ' || NOW()::TEXT,
        'This is a test activity to verify database persistence',
        'planning',
        'draft',
        'draft'
    ) RETURNING id INTO test_activity_id;
    
    RAISE NOTICE 'Created test activity with ID: %', test_activity_id;
    
    -- Try to insert a test transaction
    INSERT INTO transactions (
        activity_id,
        transaction_type,
        value,
        currency,
        transaction_date,
        provider_org_name,
        receiver_org_name,
        status
    ) VALUES (
        test_activity_id,
        '2', -- Commitment
        10000,
        'USD',
        CURRENT_DATE,
        'Test Provider',
        'Test Receiver',
        'draft'
    ) RETURNING uuid INTO test_transaction_id;
    
    RAISE NOTICE 'Created test transaction with ID: %', test_transaction_id;
    
    -- Clean up
    DELETE FROM activities WHERE id = test_activity_id;
    RAISE NOTICE 'Test completed and cleaned up successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;

-- 12. Re-enable RLS after testing (IMPORTANT!)
-- Uncomment these lines after you've identified and fixed the issue
-- ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_contacts ENABLE ROW LEVEL SECURITY;

-- 13. Summary query to check table status
SELECT 
    'Summary of table status:' as message
UNION ALL
SELECT 
    'Activities: ' || COUNT(*) || ' records' 
FROM activities
UNION ALL
SELECT 
    'Transactions: ' || COUNT(*) || ' records' 
FROM transactions
UNION ALL
SELECT 
    'Activity Sectors: ' || COUNT(*) || ' records' 
FROM activity_sectors
UNION ALL
SELECT 
    'Organizations: ' || COUNT(*) || ' records' 
FROM organizations;

-- Add missing fields to activities table for IATI compliance
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS default_aid_type TEXT;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS flow_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN activities.default_aid_type IS 'Default aid type for the activity (IATI aid type codes)';
COMMENT ON COLUMN activities.flow_type IS 'Flow type for the activity (IATI flow type codes)';

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'activities' 
AND column_name IN ('default_aid_type', 'flow_type', 'objectives', 'target_groups', 'icon'); 