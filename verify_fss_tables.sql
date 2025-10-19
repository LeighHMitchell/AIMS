-- Quick verification script
-- Copy this to Supabase SQL Editor to check if FSS tables exist

-- Check if tables exist
SELECT 
    'forward_spending_survey' as table_name,
    COUNT(*) as row_count
FROM forward_spending_survey
UNION ALL
SELECT 
    'fss_forecasts' as table_name,
    COUNT(*) as row_count
FROM fss_forecasts;

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'forward_spending_survey'
ORDER BY ordinal_position;

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'fss_forecasts'
ORDER BY ordinal_position;

