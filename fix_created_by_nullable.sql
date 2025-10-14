-- Make created_by nullable since the app uses custom auth, not Supabase Auth
-- Run this in Supabase Dashboard > SQL Editor

-- Make created_by nullable
ALTER TABLE activity_conditions 
ALTER COLUMN created_by DROP NOT NULL;

-- Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_conditions' 
  AND column_name = 'created_by';

