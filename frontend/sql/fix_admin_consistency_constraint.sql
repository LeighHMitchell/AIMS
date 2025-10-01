-- Fix the admin consistency constraint to be more flexible
-- The constraint was too strict - it required both township_code and state_region_code
-- to be present when township_name exists, but our geocoding data often has names without codes

-- Drop the existing constraint
ALTER TABLE activity_locations 
DROP CONSTRAINT IF EXISTS activity_locations_admin_consistency;

-- Add a simple constraint: if township_name exists, state_region_name must also exist
ALTER TABLE activity_locations 
ADD CONSTRAINT activity_locations_admin_consistency 
CHECK (
    township_name IS NULL OR state_region_name IS NOT NULL
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT activity_locations_admin_consistency ON activity_locations 
IS 'Ensures that if township_name is provided, state_region_name must also be provided for consistency';