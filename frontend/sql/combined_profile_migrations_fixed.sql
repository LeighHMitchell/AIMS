-- Combined Profile & Notifications Migration (Fixed for Policy Syntax)
-- This file combines both migrations in the correct order
-- Run this file once to set up profiles, notifications, and extended user fields

-- =====================================================
-- PART 1: Create profiles and notifications tables
-- =====================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  position TEXT,
  iati_preferred_language VARCHAR(10),
  iati_default_currency VARCHAR(3),
  iati_reporting_org_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('mention', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create profiles for existing users
INSERT INTO profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- PART 2: Update users table with full profile fields
-- =====================================================

-- Add new columns to users table if they don't exist
DO $$
BEGIN
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'first_name') THEN
    ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
  END IF;

  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'last_name') THEN
    ALTER TABLE users ADD COLUMN last_name VARCHAR(255);
  END IF;

  -- Add organisation column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'organisation') THEN
    ALTER TABLE users ADD COLUMN organisation VARCHAR(255);
  END IF;

  -- Add department column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'department') THEN
    ALTER TABLE users ADD COLUMN department VARCHAR(255);
  END IF;

  -- Add job_title column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'job_title') THEN
    ALTER TABLE users ADD COLUMN job_title VARCHAR(255);
  END IF;

  -- Add telephone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'telephone') THEN
    ALTER TABLE users ADD COLUMN telephone VARCHAR(50);
  END IF;

  -- Add website column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'website') THEN
    ALTER TABLE users ADD COLUMN website VARCHAR(255);
  END IF;

  -- Add mailing_address column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'mailing_address') THEN
    ALTER TABLE users ADD COLUMN mailing_address TEXT;
  END IF;
END $$;

-- First, update any existing roles to the new values
UPDATE users 
SET role = CASE 
  WHEN role = 'admin' THEN 'super_user'
  WHEN role = 'orphan' THEN 'dev_partner_tier_2'
  ELSE role
END
WHERE role IN ('admin', 'orphan');

-- Drop the existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new role constraint with updated values
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_user', 'dev_partner_tier_1', 'dev_partner_tier_2', 'gov_partner_tier_1', 'gov_partner_tier_2'));

-- Create function to sync users table with profiles table
CREATE OR REPLACE FUNCTION sync_users_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding profile fields when users table is updated
  UPDATE profiles
  SET 
    phone = NEW.telephone,
    position = NEW.job_title,
    updated_at = NOW()
  WHERE user_id = NEW.auth_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync fields
DROP TRIGGER IF EXISTS sync_users_to_profiles ON users;
CREATE TRIGGER sync_users_to_profiles
  AFTER UPDATE OF telephone, job_title ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_users_profile_fields();

-- Create function to sync profiles table with users table
CREATE OR REPLACE FUNCTION sync_profiles_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Update corresponding user fields when profiles table is updated
  SELECT * INTO user_record FROM users WHERE auth_id = NEW.user_id;
  
  IF user_record IS NOT NULL THEN
    UPDATE users
    SET 
      telephone = NEW.phone,
      job_title = NEW.position,
      updated_at = NOW()
    WHERE auth_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync fields
DROP TRIGGER IF EXISTS sync_profiles_to_users ON profiles;
CREATE TRIGGER sync_profiles_to_users
  AFTER UPDATE OF phone, position ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profiles_user_fields();

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

-- Update RLS policies if needed
CREATE POLICY "Users can view their own record" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT, UPDATE, INSERT ON profiles TO authenticated;
GRANT SELECT, UPDATE, INSERT ON notifications TO authenticated;

-- =====================================================
-- Verification queries (commented out, run manually to verify)
-- =====================================================
-- SELECT COUNT(*) FROM profiles;
-- SELECT COUNT(*) FROM notifications;
-- SELECT first_name, last_name, role FROM users LIMIT 5; 