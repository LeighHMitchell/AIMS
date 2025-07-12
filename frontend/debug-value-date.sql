-- Debug what's happening with value_date field
-- Run this in your Supabase SQL editor

-- First, check if the value_date column exists and what type it is
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name IN ('transaction_date', 'value_date')
ORDER BY column_name;

-- Check what's actually in the transactions table
SELECT 
  uuid,
  transaction_date,
  value_date,
  currency,
  value,
  created_at,
  updated_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Try a simple update to see if it works
UPDATE transactions 
SET value_date = '2025-07-11' 
WHERE uuid = (
  SELECT uuid 
  FROM transactions 
  WHERE transaction_date = '2025-07-11' 
  LIMIT 1
);

-- Check if the update worked
SELECT 
  uuid,
  transaction_date,
  value_date,
  'After manual update' as note
FROM transactions 
WHERE transaction_date = '2025-07-11'
LIMIT 3;