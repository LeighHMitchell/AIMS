-- Add onboarding_completed flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Backfill existing users who have logged in as completed
UPDATE users SET onboarding_completed = true WHERE last_login IS NOT NULL;

-- Also mark any super_user/admin as completed (they were created by system)
UPDATE users SET onboarding_completed = true WHERE role IN ('super_user', 'admin');
