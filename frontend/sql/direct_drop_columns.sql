-- Direct approach to drop legacy columns
-- Run this in Supabase SQL Editor

-- Drop columns directly without checks
ALTER TABLE organizations 
DROP COLUMN short_name CASCADE,
DROP COLUMN identifier CASCADE;

-- If the above fails, try one at a time:
-- ALTER TABLE organizations DROP COLUMN short_name CASCADE;
-- ALTER TABLE organizations DROP COLUMN identifier CASCADE; 