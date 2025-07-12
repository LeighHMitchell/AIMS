-- Script to reset and convert existing EUR transactions
-- Run this after deploying the fixed currency converter

-- Step 1: Reset EUR transactions to allow conversion
UPDATE transactions 
SET 
  usd_convertible = true,
  usd_conversion_date = NULL,
  value_usd = NULL,
  exchange_rate_used = NULL
WHERE currency = 'EUR' 
  AND value > 0;

-- Step 2: Show what we're about to convert
SELECT 
  uuid,
  value,
  currency,
  transaction_date,
  value_date,
  'Ready for conversion' as status
FROM transactions 
WHERE currency = 'EUR' 
  AND value > 0
  AND value_usd IS NULL
ORDER BY created_at DESC;

-- Step 3: Instructions
-- After running this script:
-- 1. Deploy your code changes (the fixed converter)
-- 2. Test the fixed converter: http://localhost:3000/api/currency/test-fixed?amount=100&from=EUR&date=2025-07-11
-- 3. Convert your transactions by POSTing to: http://localhost:3000/api/currency/test-fixed
--    with body: {"transactionId": "your-transaction-uuid"}
-- 4. Or create a new EUR transaction and it should auto-convert

-- You can also check the conversion worked:
-- SELECT uuid, value, currency, value_usd, exchange_rate_used, usd_convertible 
-- FROM transactions WHERE currency = 'EUR' ORDER BY created_at DESC; 