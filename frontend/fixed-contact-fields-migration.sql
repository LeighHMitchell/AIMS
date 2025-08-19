-- Add advanced contact fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contact_type TEXT,
ADD COLUMN IF NOT EXISTS secondary_email TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS fax_number TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add email validation constraint (with proper existence check)
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_secondary_email_format'
        AND table_name = 'users'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT check_secondary_email_format 
        CHECK (secondary_email IS NULL OR secondary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_contact_type ON users(contact_type);
CREATE INDEX IF NOT EXISTS idx_users_secondary_email ON users(secondary_email);
