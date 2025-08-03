-- Migration: Update activity_contacts table to support revised contact structure
-- This migration adds support for organization references and multiple email fields

-- Add new columns to activity_contacts table
ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS organisation_id UUID,
ADD COLUMN IF NOT EXISTS organisation_name TEXT,
ADD COLUMN IF NOT EXISTS primary_email TEXT,
ADD COLUMN IF NOT EXISTS secondary_email TEXT;

-- Add foreign key constraint for organisation_id
ALTER TABLE activity_contacts 
ADD CONSTRAINT fk_activity_contacts_organisation 
FOREIGN KEY (organisation_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Create index for organisation_id for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_contacts_organisation_id 
ON activity_contacts(organisation_id);

-- Migrate existing data:
-- 1. Move existing email data to primary_email
UPDATE activity_contacts 
SET primary_email = email 
WHERE email IS NOT NULL AND primary_email IS NULL;

-- 2. Move existing organisation text to organisation_name
UPDATE activity_contacts 
SET organisation_name = organisation 
WHERE organisation IS NOT NULL AND organisation_name IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN activity_contacts.organisation_id IS 'Foreign key reference to organizations table';
COMMENT ON COLUMN activity_contacts.organisation_name IS 'Organization name (fallback when organisation_id is not available)';
COMMENT ON COLUMN activity_contacts.primary_email IS 'Primary email address for the contact';
COMMENT ON COLUMN activity_contacts.secondary_email IS 'Secondary email address for the contact';

-- Note: We keep the old 'email' and 'organisation' columns for backward compatibility
-- They can be removed in a future migration once all applications are updated
COMMENT ON COLUMN activity_contacts.email IS 'DEPRECATED: Use primary_email instead. Kept for backward compatibility.';
COMMENT ON COLUMN activity_contacts.organisation IS 'DEPRECATED: Use organisation_name instead. Kept for backward compatibility.';