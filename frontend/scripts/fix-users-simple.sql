-- Simple step-by-step fix for users

-- Step 1: Check current users with old roles
SELECT email, role, name FROM users WHERE role IN ('admin', 'member', 'viewer');

-- Step 2: Update admin users
UPDATE users 
SET role = 'dev_partner_tier_1'
WHERE role = 'admin';

-- Step 3: Update member users with organizations
UPDATE users 
SET role = 'dev_partner_tier_2'
WHERE role = 'member' AND organization_id IS NOT NULL;

-- Step 4: Update member users without organizations
UPDATE users 
SET role = 'orphan'
WHERE role = 'member' AND organization_id IS NULL;

-- Step 5: Update viewer users
UPDATE users 
SET role = 'orphan'
WHERE role = 'viewer';

-- Step 6: Verify all users have valid roles
SELECT email, role, name FROM users ORDER BY role;

-- Step 7: Now add the constraint (only after all users are updated)
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