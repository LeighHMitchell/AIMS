-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql/new
-- Paste this SQL and click "Run"

-- Add activity_scope column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS activity_scope VARCHAR(2) NULL;

-- Add constraint to ensure only valid IATI Activity Scope codes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activities_activity_scope_check'
    ) THEN
        ALTER TABLE activities 
        ADD CONSTRAINT activities_activity_scope_check 
        CHECK (activity_scope IS NULL OR activity_scope IN ('1', '2', '3', '4', '5', '6', '7', '8'));
    END IF;
END $$;

-- Add comment explaining the field
COMMENT ON COLUMN activities.activity_scope IS 'IATI Activity Scope code: 1=Global, 2=Regional, 3=Multi-national, 4=National, 5=Sub-national multi-first-level, 6=Sub-national single first-level, 7=Sub-national single second-level, 8=Single location';

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'activities' 
AND column_name = 'activity_scope';