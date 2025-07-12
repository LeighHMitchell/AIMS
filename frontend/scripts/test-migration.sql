-- Test script to verify the enhanced currency converter migration
-- Run this after the main migration to ensure everything works

-- Test 1: Check if exchange_rates table exists and has correct structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'exchange_rates'
ORDER BY ordinal_position;

-- Test 2: Check if supported_currencies table exists and has correct structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'supported_currencies'
ORDER BY ordinal_position;

-- Test 3: Check if indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('exchange_rates', 'supported_currencies')
ORDER BY tablename, indexname;

-- Test 4: Check if RLS policies were created
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('exchange_rates', 'supported_currencies')
ORDER BY tablename, policyname;

-- Test 5: Test inserting a sample exchange rate
INSERT INTO exchange_rates (from_currency, to_currency, exchange_rate, rate_date, source) 
VALUES ('EUR', 'USD', 1.0850, '2024-01-15', 'test')
ON CONFLICT (from_currency, to_currency, rate_date) DO UPDATE SET
  exchange_rate = EXCLUDED.exchange_rate,
  source = EXCLUDED.source,
  fetched_at = CURRENT_TIMESTAMP;

-- Test 6: Query the test data
SELECT * FROM exchange_rates WHERE from_currency = 'EUR' AND to_currency = 'USD';

-- Test 7: Check supported currencies count
SELECT COUNT(*) as currency_count FROM supported_currencies WHERE is_supported = true;

-- Test 8: Check a few sample currencies
SELECT code, name, is_supported FROM supported_currencies 
WHERE code IN ('USD', 'EUR', 'GBP', 'JPY', 'MMK') 
ORDER BY code;

-- Clean up test data
DELETE FROM exchange_rates WHERE source = 'test';

-- Success message
SELECT 'Migration test completed successfully!' as result; 