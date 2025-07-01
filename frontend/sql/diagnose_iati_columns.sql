-- Diagnose current column names in activities table

-- 1. Show ALL columns in activities table
SELECT 
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'activities'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Specifically check for IATI-related columns
SELECT 
  'Column Check' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_id') THEN 'YES' ELSE 'NO' END as has_iati_id,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') THEN 'YES' ELSE 'NO' END as has_iati_identifier,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title') THEN 'YES' ELSE 'NO' END as has_title,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title_narrative') THEN 'YES' ELSE 'NO' END as has_title_narrative,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description') THEN 'YES' ELSE 'NO' END as has_description,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description_narrative') THEN 'YES' ELSE 'NO' END as has_description_narrative;

-- 3. Check if the safe_rename_column function exists
SELECT 
  'Function Check' as check_type,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'safe_rename_column'; 