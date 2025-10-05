-- Fix government_inputs foreign key constraint issue
-- This allows created_by and updated_by to be NULL or reference non-auth users

-- Drop the existing foreign key constraints that are causing issues
ALTER TABLE government_inputs 
DROP CONSTRAINT IF EXISTS government_inputs_created_by_fkey;

ALTER TABLE government_inputs 
DROP CONSTRAINT IF EXISTS government_inputs_updated_by_fkey;

-- Option 1: Make the columns nullable and remove the constraint entirely
-- This is the safest option if your users table is separate from auth.users
ALTER TABLE government_inputs 
ALTER COLUMN created_by DROP NOT NULL,
ALTER COLUMN updated_by DROP NOT NULL;

-- Option 2: If you want to keep the constraint but make it more flexible
-- Uncomment this section if you want to reference the users table instead of auth.users
/*
ALTER TABLE government_inputs 
ADD CONSTRAINT government_inputs_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

ALTER TABLE government_inputs 
ADD CONSTRAINT government_inputs_updated_by_fkey 
FOREIGN KEY (updated_by) 
REFERENCES users(id) 
ON DELETE SET NULL;
*/

-- Verify the changes
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'government_inputs'
AND constraint_type = 'FOREIGN KEY';

-- Check column details
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'government_inputs'
AND column_name IN ('created_by', 'updated_by');


