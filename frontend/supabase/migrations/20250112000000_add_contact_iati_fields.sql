-- Add IATI-compliant contact fields to activity_contacts table
-- These fields ensure full IATI contact-info element support

DO $$ 
BEGIN
    -- Add website column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'website'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN website TEXT;
        COMMENT ON COLUMN public.activity_contacts.website IS 'Website URL of the contact (IATI contact-info/website)';
    END IF;

    -- Add mailing_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'mailing_address'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN mailing_address TEXT;
        COMMENT ON COLUMN public.activity_contacts.mailing_address IS 'Physical mailing address (IATI contact-info/mailing-address)';
    END IF;

    -- Add department column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'department'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN department TEXT;
        COMMENT ON COLUMN public.activity_contacts.department IS 'Department within organization (IATI contact-info/department)';
    END IF;

    -- Add job_title column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'job_title'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN job_title TEXT;
        COMMENT ON COLUMN public.activity_contacts.job_title IS 'Job title of the contact (IATI contact-info/job-title)';
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    'IATI contact fields migration complete' as status,
    COUNT(*) as new_columns_added
FROM information_schema.columns
WHERE table_name = 'activity_contacts' 
AND table_schema = 'public'
AND column_name IN ('website', 'mailing_address', 'department', 'job_title');

