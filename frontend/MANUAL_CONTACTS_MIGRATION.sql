-- MANUAL MIGRATION: Update activity_contacts table for revised contact structure
-- Run this SQL directly in your Supabase dashboard SQL editor

-- First, check if the columns already exist to avoid errors
DO $$ 
BEGIN
    -- Add organisation_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contacts' AND column_name = 'organisation_id') THEN
        ALTER TABLE activity_contacts ADD COLUMN organisation_id UUID;
    END IF;
    
    -- Add organisation_name column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contacts' AND column_name = 'organisation_name') THEN
        ALTER TABLE activity_contacts ADD COLUMN organisation_name TEXT;
    END IF;
    
    -- Add primary_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contacts' AND column_name = 'primary_email') THEN
        ALTER TABLE activity_contacts ADD COLUMN primary_email TEXT;
    END IF;
    
    -- Add secondary_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_contacts' AND column_name = 'secondary_email') THEN
        ALTER TABLE activity_contacts ADD COLUMN secondary_email TEXT;
    END IF;
END $$;

-- Add foreign key constraint for organisation_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_activity_contacts_organisation') THEN
        ALTER TABLE activity_contacts 
        ADD CONSTRAINT fk_activity_contacts_organisation 
        FOREIGN KEY (organisation_id) REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for organisation_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE indexname = 'idx_activity_contacts_organisation_id') THEN
        CREATE INDEX idx_activity_contacts_organisation_id 
        ON activity_contacts(organisation_id);
    END IF;
END $$;

-- Migrate existing data: Move email to primary_email
UPDATE activity_contacts 
SET primary_email = email 
WHERE email IS NOT NULL AND primary_email IS NULL;

-- Migrate existing data: Move organisation to organisation_name  
UPDATE activity_contacts 
SET organisation_name = organisation 
WHERE organisation IS NOT NULL AND organisation_name IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN activity_contacts.organisation_id IS 'Foreign key reference to organizations table';
COMMENT ON COLUMN activity_contacts.organisation_name IS 'Organization name (fallback when organisation_id is not available)';
COMMENT ON COLUMN activity_contacts.primary_email IS 'Primary email address for the contact';
COMMENT ON COLUMN activity_contacts.secondary_email IS 'Secondary email address for the contact';
COMMENT ON COLUMN activity_contacts.email IS 'DEPRECATED: Use primary_email instead. Kept for backward compatibility.';
COMMENT ON COLUMN activity_contacts.organisation IS 'DEPRECATED: Use organisation_name instead. Kept for backward compatibility.';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'activity_contacts' 
ORDER BY ordinal_position;