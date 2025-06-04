-- Investigate current user roles in the database

-- 1. See all unique roles currently in the users table
SELECT DISTINCT role, COUNT(*) as count 
FROM users 
GROUP BY role
ORDER BY role;

-- 2. See all users and their roles
SELECT id, email, role, name 
FROM users 
ORDER BY role, email;

-- 3. Find users that would violate the new constraint
SELECT id, email, role, name 
FROM users 
WHERE role NOT IN (
  'super_user',
  'dev_partner_tier_1',
  'dev_partner_tier_2',
  'gov_partner_tier_1',
  'gov_partner_tier_2',
  'orphan'
); 