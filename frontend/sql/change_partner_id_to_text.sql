-- Change partner_id from UUID to TEXT to allow non-UUID values
ALTER TABLE activities 
ALTER COLUMN partner_id TYPE TEXT;

-- Add a comment to document the change
COMMENT ON COLUMN activities.partner_id IS 'Partner-specific identifier for the activity (can be any text value)'; 