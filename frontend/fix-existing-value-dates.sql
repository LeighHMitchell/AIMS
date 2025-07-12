-- Fix existing transactions to have value_date = transaction_date where value_date is null
-- Run this in your Supabase SQL editor

-- Update all existing transactions that have null value_date but have transaction_date
UPDATE transactions 
SET value_date = transaction_date 
WHERE value_date IS NULL 
  AND transaction_date IS NOT NULL;

-- Verify the fix worked
SELECT 
  uuid,
  transaction_date,
  value_date,
  CASE 
    WHEN value_date IS NULL THEN 'Still missing value_date'
    WHEN value_date = transaction_date THEN 'Fixed: matches transaction_date'
    ELSE 'Different from transaction_date'
  END as status,
  currency,
  value
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Show summary of the fix
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN value_date IS NOT NULL THEN 1 END) as transactions_with_value_date,
  COUNT(CASE WHEN value_date IS NULL THEN 1 END) as transactions_missing_value_date,
  COUNT(CASE WHEN value_date = transaction_date THEN 1 END) as value_date_matches_transaction_date
FROM transactions;