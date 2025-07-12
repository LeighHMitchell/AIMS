-- Test query to check if value_date is being saved correctly
-- Run this in your Supabase SQL editor

SELECT 
  uuid,
  transaction_date,
  value_date,
  CASE 
    WHEN value_date IS NULL THEN 'Missing value_date'
    WHEN value_date = transaction_date THEN 'Matches transaction_date'
    ELSE 'Different from transaction_date'
  END as value_date_status,
  currency,
  value,
  created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;