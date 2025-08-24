-- Add default_disbursement_channel field to activities table
-- This field will store the default disbursement channel for new transactions in an activity

-- Add the column
ALTER TABLE activities 
ADD COLUMN default_disbursement_channel VARCHAR(4);

-- Add a check constraint to ensure valid IATI disbursement channel codes
ALTER TABLE activities 
ADD CONSTRAINT chk_default_disbursement_channel 
CHECK (default_disbursement_channel IS NULL OR default_disbursement_channel IN ('1', '2', '3', '4'));

-- Add a comment to document the field
COMMENT ON COLUMN activities.default_disbursement_channel IS 'Default IATI disbursement channel code for new transactions. 1=Central Ministry/Treasury, 2=Direct to institution, 3=Aid in kind via third party, 4=Not reported';

-- Create an index for performance (optional, but helpful for queries)
CREATE INDEX idx_activities_default_disbursement_channel ON activities(default_disbursement_channel) WHERE default_disbursement_channel IS NOT NULL;
