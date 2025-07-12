-- Correct fix for value_date field
-- Rule: value_date should ALWAYS equal transaction_date unless user manually overrides it
-- Run this in your Supabase SQL editor

-- Step 1: See current state
SELECT 
  'Before Fix' as step,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN value_date IS NOT NULL THEN 1 END) as has_value_date,
  COUNT(CASE WHEN value_date IS NULL THEN 1 END) as missing_value_date,
  COUNT(CASE WHEN value_date = transaction_date THEN 1 END) as value_date_matches_transaction_date
FROM transactions;

-- Step 2: Set value_date = transaction_date for ALL transactions where value_date is NULL
UPDATE transactions 
SET value_date = transaction_date
WHERE value_date IS NULL 
  AND transaction_date IS NOT NULL;

-- Step 3: Verify the fix - should show all value_dates match transaction_dates
SELECT 
  'After Fix' as step,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN value_date IS NOT NULL THEN 1 END) as has_value_date,
  COUNT(CASE WHEN value_date IS NULL THEN 1 END) as missing_value_date,
  COUNT(CASE WHEN value_date = transaction_date THEN 1 END) as value_date_matches_transaction_date
FROM transactions;

-- Step 4: Show the results - should all be "✅ Matches transaction_date"
SELECT 
  uuid,
  transaction_date,
  value_date,
  CASE 
    WHEN value_date IS NULL THEN '❌ Still NULL'
    WHEN value_date = transaction_date THEN '✅ Matches transaction_date'
    ELSE '⚠️ User manually set different value_date'
  END as status,
  currency,
  value
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;