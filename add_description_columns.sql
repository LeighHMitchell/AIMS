-- Add the new description type columns to the activities table
-- Run this SQL against your Supabase database

-- Add description objectives column (IATI type 2)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_objectives TEXT NULL;

-- Add description target groups column (IATI type 3) 
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_target_groups TEXT NULL;

-- Add description other column (IATI type 4)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_other TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN activities.description_objectives IS 'Activity description focusing on specific objectives (IATI Description Type 2)';
COMMENT ON COLUMN activities.description_target_groups IS 'Activity description focusing on target groups and beneficiaries (IATI Description Type 3)';
COMMENT ON COLUMN activities.description_other IS 'Additional activity description for other relevant information (IATI Description Type 4)';
COMMENT ON COLUMN activities.description_narrative IS 'General activity description (IATI Description Type 1)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND column_name IN ('description_objectives', 'description_target_groups', 'description_other')
ORDER BY column_name;