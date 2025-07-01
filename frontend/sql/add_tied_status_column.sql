-- Add tied_status column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS tied_status TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN activities.tied_status IS 'IATI tied status code (1=Tied, 2=Partially tied, 3=Untied, 4=Not reported)'; 