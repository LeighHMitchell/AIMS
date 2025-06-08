-- Alternative approach: Make partner_id a text field for storing partner's internal activity identifier
-- This allows partners to use their own activity ID formats

-- First, drop the foreign key constraint if it exists
ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS fk_activities_partner_id;

-- Change the column type to text
ALTER TABLE activities 
ALTER COLUMN partner_id TYPE TEXT USING partner_id::TEXT;

-- Add comment to clarify this is the partner's internal ID
COMMENT ON COLUMN activities.partner_id IS 'The partner organization''s internal identifier for this activity (free text)';

-- Create index for text search
CREATE INDEX IF NOT EXISTS idx_activities_partner_id_text ON activities(partner_id); 