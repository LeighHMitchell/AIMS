-- Step-by-step fix for users table constraint issue

-- Step 1: First, let's see what constraints exist (works with PostgreSQL 12+)
SELECT 
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'users';

-- Step 2: Drop the constraint (it might have a different name)
-- If the above query shows a different constraint name, replace 'users_role_check' with that name
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Now update the existing users
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

-- Step 4: Add the new constraint
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

-- Step 5: Verify the changes
SELECT email, role FROM users ORDER BY created_at; 