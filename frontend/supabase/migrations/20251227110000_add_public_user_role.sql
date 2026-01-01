-- Add public_user role to the users table role constraint
-- This role is for OAuth users who can view activities but not edit them

-- Step 1: Drop existing CHECK constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new constraint including 'public_user'
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'super_user', 
  'dev_partner_tier_1', 
  'dev_partner_tier_2', 
  'gov_partner_tier_1', 
  'gov_partner_tier_2',
  'public_user',
  'admin'  -- Legacy admin role
));

-- Step 3: Add comment for documentation
COMMENT ON CONSTRAINT users_role_check ON public.users IS 
'Valid user roles: super_user (full access), dev_partner_tier_1 (data submission), dev_partner_tier_2 (review & approval), gov_partner_tier_1/2 (government partners), public_user (read-only OAuth users), admin (legacy)';


