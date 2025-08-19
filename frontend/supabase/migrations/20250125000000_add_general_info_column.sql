-- Add general_info JSONB column to activities table
-- This migration adds support for storing general activity information including Aid Effectiveness data

-- Add general_info column to activities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'general_info'
  ) THEN
    ALTER TABLE public.activities 
    ADD COLUMN general_info JSONB DEFAULT '{}'::jsonb;
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.activities.general_info IS 'JSONB object containing general activity information including Aid Effectiveness data, metadata, and other form data';
    
    -- Create GIN index for better performance on JSONB queries
    CREATE INDEX idx_activities_general_info ON activities USING GIN (general_info);
    
    -- Create specific index for Aid Effectiveness queries
    CREATE INDEX idx_activities_aid_effectiveness ON activities USING GIN ((general_info->'aidEffectiveness'));
    
    RAISE NOTICE 'Added general_info column to activities table with indexes';
  ELSE
    RAISE NOTICE 'general_info column already exists in activities table';
  END IF;
END $$;

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
AND column_name = 'general_info';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. Activities table now has general_info JSONB column for Aid Effectiveness data.';
END $$;
