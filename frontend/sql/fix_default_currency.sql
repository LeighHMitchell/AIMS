-- Fix default_currency column in organizations table
-- This script:
-- 1. Sets the proper DEFAULT value for the column
-- 2. Updates existing NULL values to 'USD'

-- Step 1: Set the default value for the column
ALTER TABLE organizations 
ALTER COLUMN default_currency SET DEFAULT 'USD';

-- Step 2: Update all NULL values to 'USD'
UPDATE organizations 
SET default_currency = 'USD' 
WHERE default_currency IS NULL;

-- Step 3: Also ensure default_language has proper default
ALTER TABLE organizations 
ALTER COLUMN default_language SET DEFAULT 'en';

-- Step 4: Update any NULL default_language values to 'en'
UPDATE organizations 
SET default_language = 'en' 
WHERE default_language IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('default_currency', 'default_language')
ORDER BY column_name;

-- Show updated data
SELECT 
    id,
    name,
    default_currency,
    default_language
FROM organizations 
ORDER BY name
LIMIT 10;











