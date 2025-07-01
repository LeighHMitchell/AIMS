-- Show ALL columns in activities table to understand the schema

SELECT 
  ordinal_position as pos,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'activities'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Look for date-related columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'activities'
  AND table_schema = 'public'
  AND (
    column_name LIKE '%date%' 
    OR column_name LIKE '%start%' 
    OR column_name LIKE '%end%'
    OR data_type IN ('date', 'timestamp', 'timestamp with time zone', 'timestamp without time zone')
  )
ORDER BY column_name; 