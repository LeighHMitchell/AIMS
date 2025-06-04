-- Comprehensive fix for users table
-- This script fixes the role constraint and updates existing users

-- Step 1: Update existing users to use the correct role values
UPDATE users 
SET role = CASE 
  WHEN role = 'admin' AND email LIKE '%worldbank%' THEN 'dev_partner_tier_1'
  WHEN role = 'admin' AND email LIKE '%mof.gov%' THEN 'gov_partner_tier_1'
  WHEN role = 'member' AND email LIKE '%undp%' THEN 'dev_partner_tier_2'
  WHEN role = 'member' AND email LIKE '%moe.gov%' THEN 'gov_partner_tier_2'
  WHEN role = 'viewer' THEN 'orphan'
  ELSE role
END
WHERE role IN ('admin', 'member', 'viewer');

-- Step 2: Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Add new constraint with all the role values used by the app
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

-- Step 4: Show the updated users to confirm
SELECT email, role FROM users ORDER BY created_at; 