-- Add organisation_id column to activity_contacts table
-- This allows linking contacts to organizations from the organizations table

-- Add the organisation_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'organisation_id'
    ) THEN
        ALTER TABLE activity_contacts 
        ADD COLUMN organisation_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_activity_contacts_organisation_id 
        ON activity_contacts(organisation_id);
        
        COMMENT ON COLUMN activity_contacts.organisation_id IS 'Foreign key reference to organizations table';
    END IF;
END $$;

-- Add secondary_email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'secondary_email'
    ) THEN
        ALTER TABLE activity_contacts 
        ADD COLUMN secondary_email TEXT;
        
        COMMENT ON COLUMN activity_contacts.secondary_email IS 'Secondary email address for the contact';
    END IF;
END $$;

-- Add display_on_web column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'display_on_web'
    ) THEN
        ALTER TABLE activity_contacts 
        ADD COLUMN display_on_web BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN activity_contacts.display_on_web IS 'Whether this contact should be displayed on public web pages';
    END IF;
END $$;

-- Add user_id column if it doesn't exist (for focal points)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE activity_contacts 
        ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_activity_contacts_user_id 
        ON activity_contacts(user_id);
        
        COMMENT ON COLUMN activity_contacts.user_id IS 'Optional reference to a system user (for focal points)';
    END IF;
END $$;

-- Add role column if it doesn't exist (for focal points)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE activity_contacts 
        ADD COLUMN role TEXT;
        
        COMMENT ON COLUMN activity_contacts.role IS 'Role of the contact (e.g., for focal points)';
    END IF;
END $$;

-- Add name column if it doesn't exist (for focal points)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE activity_contacts 
        ADD COLUMN name TEXT;
        
        COMMENT ON COLUMN activity_contacts.name IS 'Full name (alternative to first/last name fields)';
    END IF;
END $$;
