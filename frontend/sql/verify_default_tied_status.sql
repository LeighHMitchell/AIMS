-- Check if default_tied_status column exists in activities table
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'activities' 
    AND column_name = 'default_tied_status';

-- If the column doesn't exist, run this to add it:
-- ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_tied_status VARCHAR(10);
-- COMMENT ON COLUMN activities.default_tied_status IS 'Default tied status for transactions (3=Partially tied, 4=Tied, 5=Untied)';

-- Test query to see activities with default_tied_status
SELECT 
    id,
    title_narrative,
    default_aid_type,
    default_finance_type,
    default_currency,
    default_flow_type,
    default_tied_status
FROM 
    activities
LIMIT 5; 