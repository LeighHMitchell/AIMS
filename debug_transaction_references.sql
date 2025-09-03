-- Debug script to check for duplicate or problematic transaction references

-- 1. Check for duplicate transaction references within the same activity
SELECT 
    activity_id,
    transaction_reference,
    COUNT(*) as count,
    STRING_AGG(uuid::text, ', ') as transaction_uuids
FROM transactions 
WHERE transaction_reference IS NOT NULL 
  AND transaction_reference != ''
GROUP BY activity_id, transaction_reference
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Check for empty string references (these cause unique constraint issues)
SELECT 
    activity_id,
    uuid,
    transaction_reference,
    transaction_date,
    value,
    currency
FROM transactions 
WHERE transaction_reference = ''
ORDER BY activity_id, transaction_date;

-- 3. Check for NULL references
SELECT 
    activity_id,
    uuid,
    transaction_reference,
    transaction_date,
    value,
    currency
FROM transactions 
WHERE transaction_reference IS NULL
ORDER BY activity_id, transaction_date;

-- 4. Show all transaction references for a specific activity (replace with your activity ID)
-- SELECT 
--     uuid,
--     transaction_reference,
--     transaction_date,
--     value,
--     currency
-- FROM transactions 
-- WHERE activity_id = 'YOUR_ACTIVITY_ID_HERE'
-- ORDER BY transaction_date;
