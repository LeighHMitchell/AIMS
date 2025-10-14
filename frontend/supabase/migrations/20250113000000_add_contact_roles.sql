-- Add contact roles and user linking to activity_contacts table
-- This enables focal point designation, editing rights, and user account linking

DO $$ 
BEGIN
    -- Add is_focal_point column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'is_focal_point'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN is_focal_point BOOLEAN DEFAULT false;
        COMMENT ON COLUMN public.activity_contacts.is_focal_point IS 'Whether this contact is a focal point for the activity';
    END IF;

    -- Add has_editing_rights column  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'has_editing_rights'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN has_editing_rights BOOLEAN DEFAULT false;
        COMMENT ON COLUMN public.activity_contacts.has_editing_rights IS 'Whether this contact has editing/contributor rights to the activity';
    END IF;

    -- Add linked_user_id for existing user associations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'linked_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN linked_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        COMMENT ON COLUMN public.activity_contacts.linked_user_id IS 'Reference to existing user account in the system';
    END IF;
END $$;

-- Create index for linked_user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_contacts_linked_user_id 
ON public.activity_contacts(linked_user_id) 
WHERE linked_user_id IS NOT NULL;

-- Create index for focal points for quick lookup
CREATE INDEX IF NOT EXISTS idx_activity_contacts_is_focal_point 
ON public.activity_contacts(activity_id, is_focal_point) 
WHERE is_focal_point = true;

-- Create index for contacts with editing rights
CREATE INDEX IF NOT EXISTS idx_activity_contacts_has_editing_rights 
ON public.activity_contacts(activity_id, has_editing_rights) 
WHERE has_editing_rights = true;

-- Verify the columns were added
SELECT 
    'Contact roles migration complete' as status,
    COUNT(*) as new_columns_added
FROM information_schema.columns
WHERE table_name = 'activity_contacts' 
AND table_schema = 'public'
AND column_name IN ('is_focal_point', 'has_editing_rights', 'linked_user_id');

