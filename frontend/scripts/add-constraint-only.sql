-- Add the role constraint to users table

-- First check if constraint already exists
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_role_check';

-- Add the constraint if it doesn't exist
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'super_user',
  'dev_partner_tier_1',
  'dev_partner_tier_2',
  'gov_partner_tier_1',
  'gov_partner_tier_2',
  'orphan'
));

-- Verify constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_role_check'; 