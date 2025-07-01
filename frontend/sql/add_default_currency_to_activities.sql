-- Add default_currency column to activities table for IATI compliance
-- This field specifies the default currency for all monetary values in an activity

-- Check if column exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'activities' 
    AND column_name = 'default_currency'
  ) THEN
    ALTER TABLE activities ADD COLUMN default_currency VARCHAR(3);
    COMMENT ON COLUMN activities.default_currency IS 'Default currency code (ISO 4217) for all monetary values in this activity per IATI standards';
  END IF;
END $$; 