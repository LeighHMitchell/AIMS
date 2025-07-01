-- Fix UUID Generation for Transactions Table
-- Run this script in Supabase SQL Editor

-- 1. Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ensure uuid column has proper default value
ALTER TABLE transactions 
ALTER COLUMN uuid SET DEFAULT gen_random_uuid();

-- 3. Generate UUIDs for any existing rows that don't have them
UPDATE transactions
SET uuid = gen_random_uuid()
WHERE uuid IS NULL;

-- 4. Ensure UUID column is NOT NULL
ALTER TABLE transactions 
ALTER COLUMN uuid SET NOT NULL;

-- 5. Verify the fix - this should return your transactions with UUIDs
SELECT 
    uuid,
    activity_id,
    transaction_type,
    value,
    status,
    created_at
FROM transactions
WHERE transaction_type = '3' 
    AND status = 'actual'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Test the disbursement totals calculation
SELECT 
    activity_id,
    COUNT(*) as transaction_count,
    SUM(value) as disbursement_total
FROM transactions
WHERE transaction_type = '3' 
    AND status = 'actual'
GROUP BY activity_id
ORDER BY disbursement_total DESC; 