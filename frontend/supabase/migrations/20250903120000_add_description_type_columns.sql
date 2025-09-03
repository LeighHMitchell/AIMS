-- Add the new description type columns to the activities table
-- IATI Standard Description Types: 1=General, 2=Objectives, 3=Target Groups, 4=Other

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