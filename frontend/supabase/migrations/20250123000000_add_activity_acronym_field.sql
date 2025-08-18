-- Add acronym field to activities table
-- This migration adds support for activity acronyms/abbreviations

-- Add acronym column to activities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'acronym'
  ) THEN
    ALTER TABLE public.activities 
    ADD COLUMN acronym TEXT;
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.activities.acronym IS 'Short acronym or abbreviation for the activity. Helps users quickly identify and reference the activity across the application.';
    
    RAISE NOTICE 'Added acronym column to activities table';
  ELSE
    RAISE NOTICE 'acronym column already exists in activities table';
  END IF;
END $$;

-- Create index for better performance on acronym searches (optional)
CREATE INDEX IF NOT EXISTS idx_activities_acronym ON activities (acronym) WHERE acronym IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON activities TO authenticated;
GRANT SELECT ON activities TO anon;

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activities' 
AND column_name = 'acronym';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. Activity acronym field is now available.';
END $$;

