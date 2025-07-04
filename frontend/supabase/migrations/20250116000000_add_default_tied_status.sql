-- Add default_tied_status column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS default_tied_status VARCHAR(10);

-- Add comment for documentation
COMMENT ON COLUMN activities.default_tied_status IS 'Default tied status for transactions (3=Partially tied, 4=Tied, 5=Untied)'; 