-- Add description/narrative fields for activity dates
-- These fields store the narrative text from IATI activity-date elements

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS planned_start_description TEXT,
ADD COLUMN IF NOT EXISTS actual_start_description TEXT,
ADD COLUMN IF NOT EXISTS planned_end_description TEXT,
ADD COLUMN IF NOT EXISTS actual_end_description TEXT;

-- Add comments to document these fields
COMMENT ON COLUMN activities.planned_start_description IS 'Description/narrative for the planned start date from IATI activity-date[@type="1"]/narrative';
COMMENT ON COLUMN activities.actual_start_description IS 'Description/narrative for the actual start date from IATI activity-date[@type="2"]/narrative';
COMMENT ON COLUMN activities.planned_end_description IS 'Description/narrative for the planned end date from IATI activity-date[@type="3"]/narrative';
COMMENT ON COLUMN activities.actual_end_description IS 'Description/narrative for the actual end date from IATI activity-date[@type="4"]/narrative';
