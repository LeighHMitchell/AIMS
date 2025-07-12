-- Comprehensive fix for value_date field
-- Run this in your Supabase SQL editor

-- Step 1: See what we're dealing with
SELECT 
  'Before Fix' as step,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN value_date IS NOT NULL THEN 1 END) as has_value_date,
  COUNT(CASE WHEN value_date IS NULL THEN 1 END) as missing_value_date,
  COUNT(CASE WHEN transaction_date IS NOT NULL THEN 1 END) as has_transaction_date,
  COUNT(CASE WHEN transaction_date IS NULL THEN 1 END) as missing_transaction_date
FROM transactions;

-- Step 2: Show some sample data
SELECT 
  uuid,
  transaction_date,
  value_date,
  currency,
  value,
  LENGTH(transaction_date::text) as transaction_date_length,
  LENGTH(value_date::text) as value_date_length
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Fix value_date for all transactions that have transaction_date
UPDATE transactions 
SET value_date = transaction_date::date
WHERE value_date IS NULL 
  AND transaction_date IS NOT NULL;

-- Step 4: For any remaining NULL value_dates, use today's date
UPDATE transactions 
SET value_date = CURRENT_DATE
WHERE value_date IS NULL;

-- Step 5: Set default for future records
ALTER TABLE transactions 
ALTER COLUMN value_date SET DEFAULT CURRENT_DATE;

-- Step 6: Verify the fix
SELECT 
  'After Fix' as step,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN value_date IS NOT NULL THEN 1 END) as has_value_date,
  COUNT(CASE WHEN value_date IS NULL THEN 1 END) as missing_value_date,
  COUNT(CASE WHEN value_date = transaction_date THEN 1 END) as value_date_matches_transaction_date
FROM transactions;

-- Step 7: Show the fixed data
SELECT 
  uuid,
  transaction_date,
  value_date,
  CASE 
    WHEN value_date IS NULL THEN '❌ Still NULL'
    WHEN value_date = transaction_date THEN '✅ Matches transaction_date'
    ELSE '⚠️ Different from transaction_date'
  END as status,
  currency,
  value
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;