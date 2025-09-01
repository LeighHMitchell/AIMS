-- Add language column to activities table with default value of 'en'
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS language VARCHAR(3) DEFAULT 'en';

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

-- Update existing activities to have English as default language if NULL
UPDATE activities SET language = 'en' WHERE language IS NULL;