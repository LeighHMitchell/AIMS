-- Test script to verify default_currency can be updated
-- Replace 'YOUR_ORG_ID' with an actual organization ID from your database

-- Step 1: View current value
SELECT id, name, default_currency, default_language
FROM organizations 
WHERE name = 'Asian Development Bank';

-- Step 2: Update to EUR (replace the id with actual ID from step 1)
-- UPDATE organizations 
-- SET default_currency = 'EUR'
-- WHERE id = 'YOUR_ORG_ID_HERE';

-- Step 3: Verify the update worked
-- SELECT id, name, default_currency, default_language
-- FROM organizations 
-- WHERE id = 'YOUR_ORG_ID_HERE';

-- Example with the Asian Development Bank ID from your data:
-- Uncomment these lines to test:

-- UPDATE organizations 
-- SET default_currency = 'EUR'
-- WHERE id = '689a2f8f-6228-4fc3-8fcb-29a4157d3bff';

-- SELECT id, name, default_currency, default_language
-- FROM organizations 
-- WHERE id = '689a2f8f-6228-4fc3-8fcb-29a4157d3bff';







