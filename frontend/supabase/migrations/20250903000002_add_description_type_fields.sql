-- Add description type fields to activities table based on IATI Standard Description Types
-- Reference: https://iatistandard.org/en/iati-standard/203/codelists/descriptiontype/

-- Add description objectives column (IATI type 2)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_objectives TEXT NULL;
COMMENT ON COLUMN activities.description_objectives IS 'Activity description focusing on specific objectives (IATI Description Type 2)';

-- Add description target groups column (IATI type 3)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_target_groups TEXT NULL;
COMMENT ON COLUMN activities.description_target_groups IS 'Activity description focusing on target groups and beneficiaries (IATI Description Type 3)';

-- Add description other column (IATI type 4)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_other TEXT NULL;
COMMENT ON COLUMN activities.description_other IS 'Additional activity description for other relevant information (IATI Description Type 4)';

-- Update the main description column comment for clarity
COMMENT ON COLUMN activities.description_narrative IS 'General activity description (IATI Description Type 1)';