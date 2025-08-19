-- Add new contact fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS contact_type TEXT,
ADD COLUMN IF NOT EXISTS secondary_email TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS fax_number TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add constraints for email format
ALTER TABLE users
ADD CONSTRAINT check_secondary_email_format 
CHECK (secondary_email IS NULL OR secondary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_contact_type ON users(contact_type);
CREATE INDEX IF NOT EXISTS idx_users_secondary_email ON users(secondary_email);

-- Update RLS policies if needed
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure users can update their own records
CREATE POLICY "Users can update own profile with new fields" ON users
FOR UPDATE USING (auth.uid()::text = id OR EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'super_user'
));
