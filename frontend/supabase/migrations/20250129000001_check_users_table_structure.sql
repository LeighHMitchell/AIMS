-- Check the structure of the users table to understand available columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check a sample user record to see actual data
SELECT * FROM users LIMIT 1;