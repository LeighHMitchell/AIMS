-- Temporarily disable the unique constraint to allow transaction creation
-- This will let us debug the reference generation without blocking saves

-- Drop the unique constraint temporarily
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS unique_transaction_ref;

-- Check current transaction references to see what's causing conflicts
SELECT 
    activity_id,
    transaction_reference,
    COUNT(*) as count,
    STRING_AGG(uuid::text, ', ') as transaction_uuids
FROM transactions 
WHERE transaction_reference IS NOT NULL 
  AND transaction_reference != ''
GROUP BY activity_id, transaction_reference
ORDER BY count DESC, activity_id;

-- Show empty string references
SELECT COUNT(*) as empty_string_count
FROM transactions 
WHERE transaction_reference = '';

-- Show NULL references  
SELECT COUNT(*) as null_count
FROM transactions 
WHERE transaction_reference IS NULL;
