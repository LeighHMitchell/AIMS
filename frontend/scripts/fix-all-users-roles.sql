-- Fix ALL users with old role values

-- First, let's see what we're dealing with
SELECT email, role, name, organization_id 
FROM users 
WHERE role IN ('admin', 'member', 'viewer')
ORDER BY role, email;

-- Update ALL users with old roles to new roles
-- This is a more comprehensive update that handles all cases
UPDATE users 
SET role = CASE 
  -- Admin users become tier 1 partners based on email domain
  WHEN role = 'admin' THEN 
    CASE 
      WHEN email LIKE '%worldbank%' OR email LIKE '%wb.%' THEN 'dev_partner_tier_1'
      WHEN email LIKE '%gov%' OR email LIKE '%mof%' THEN 'gov_partner_tier_1'
      ELSE 'dev_partner_tier_1' -- Default admins to dev_partner_tier_1
    END
  -- Member users become tier 2 partners or orphan
  WHEN role = 'member' THEN 
    CASE 
      WHEN email LIKE '%undp%' OR email LIKE '%unicef%' OR email LIKE '%unhcr%' THEN 'dev_partner_tier_2'
      WHEN email LIKE '%gov%' OR email LIKE '%moe%' THEN 'gov_partner_tier_2'
      WHEN organization_id IS NOT NULL THEN 'dev_partner_tier_2' -- If they have an org, make them tier 2
      ELSE 'orphan' -- No org = orphan
    END
  -- Viewer users become orphan
  WHEN role = 'viewer' THEN 'orphan'
  ELSE role -- Keep any roles that are already correct
END
WHERE role IN ('admin', 'member', 'viewer');

-- Now add the constraint
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

-- Verify the results
SELECT email, role, name, organization_id 
FROM users 
ORDER BY role, email; 