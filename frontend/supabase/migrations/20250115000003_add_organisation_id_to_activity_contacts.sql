-- Add organisation_id column to activity_contacts table to support organization relationships
-- This allows activity contacts to be linked to organizations in the database

DO $$ 
BEGIN
    -- Add organisation_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'organisation_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN organisation_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
        COMMENT ON COLUMN public.activity_contacts.organisation_id IS 'Organization reference for the contact';
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_activity_contacts_organisation_id ON public.activity_contacts(organisation_id) WHERE organisation_id IS NOT NULL;

-- Show status
SELECT 
    'Organisation ID column added to activity_contacts table!' as status,
    'Activity contacts can now be linked to organizations' as message;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_contacts' 
AND table_schema = 'public'
AND column_name = 'organisation_id';

