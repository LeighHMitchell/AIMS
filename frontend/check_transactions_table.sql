-- Check existing transactions table structure
-- Run this in Supabase SQL editor to see what columns exist

-- Check if transactions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
) as table_exists;

-- Show all columns in transactions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Show sample data from transactions table (first 5 rows)
SELECT * FROM transactions LIMIT 5;

-- Count total transactions
SELECT COUNT(*) as total_transactions FROM transactions; 