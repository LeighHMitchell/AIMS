-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql/new
-- Paste this SQL and click "Run"

-- Add language column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS language VARCHAR(3) NULL;

-- Add constraint to ensure only valid ISO language codes (2-3 characters)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activities_language_check'
    ) THEN
        ALTER TABLE activities 
        ADD CONSTRAINT activities_language_check 
        CHECK (language IS NULL OR (length(language) >= 2 AND length(language) <= 3));
    END IF;
END $$;

-- Add comment explaining the field
COMMENT ON COLUMN activities.language IS 'ISO language code (2-3 characters) representing the primary language of the activity';

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'activities' 
AND column_name = 'language';