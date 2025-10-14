-- Make position column nullable in activity_contacts table
-- The position field has been removed from the UI, so it should not be required

-- Remove NOT NULL constraint from position column
ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.activity_contacts.position IS 'Legacy position/role field - kept for backward compatibility but no longer required';

-- Show status
SELECT 
    'Position column is now nullable' as status,
    'Contacts can be saved without a position/role' as message;

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activity_contacts' 
AND table_schema = 'public'
AND column_name = 'position';

