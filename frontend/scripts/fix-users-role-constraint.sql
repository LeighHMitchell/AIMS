-- Fix users table role check constraint to match app's role values
-- First, drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with all the role values used by the app
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'super_user',
  'dev_partner_tier_1',
  'dev_partner_tier_2',
  'gov_partner_tier_1',
  'gov_partner_tier_2',
  'orphan',
  -- Keep the existing values for backward compatibility
  'admin',
  'member',
  'viewer'
)); 