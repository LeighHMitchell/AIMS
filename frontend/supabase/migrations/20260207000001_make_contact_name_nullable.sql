-- Make first_name and last_name nullable in activity_contacts table
-- IATI contacts can have just an organization name without a person name (e.g., "General Enquiries")
-- This migration allows importing such contacts without requiring placeholder values

-- Remove NOT NULL constraint from first_name column
ALTER TABLE public.activity_contacts ALTER COLUMN first_name DROP NOT NULL;
COMMENT ON COLUMN public.activity_contacts.first_name IS 'First name of contact person (nullable - IATI contacts may only have organization)';

-- Remove NOT NULL constraint from last_name column
ALTER TABLE public.activity_contacts ALTER COLUMN last_name DROP NOT NULL;
COMMENT ON COLUMN public.activity_contacts.last_name IS 'Last name of contact person (nullable - IATI contacts may only have organization)';

-- Verify the changes
SELECT
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activity_contacts'
AND table_schema = 'public'
AND column_name IN ('first_name', 'last_name')
ORDER BY column_name;
