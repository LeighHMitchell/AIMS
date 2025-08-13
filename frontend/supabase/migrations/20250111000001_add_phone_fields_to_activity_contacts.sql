-- Add separate country code and phone number fields to activity_contacts table
-- This allows the Contacts tab to use the same UI as the Profile section

DO $$ 
BEGIN
    -- Add country_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'country_code'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN country_code TEXT;
        COMMENT ON COLUMN public.activity_contacts.country_code IS 'International dialing code (e.g., +95, +1)';
    END IF;

    -- Add phone_number column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'phone_number'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN phone_number TEXT;
        COMMENT ON COLUMN public.activity_contacts.phone_number IS 'Local phone number without country code';
    END IF;

    -- Add fax_country_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'fax_country_code'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN fax_country_code TEXT;
        COMMENT ON COLUMN public.activity_contacts.fax_country_code IS 'International dialing code for fax (e.g., +95, +1)';
    END IF;

    -- Add fax_number column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'fax_number'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.activity_contacts ADD COLUMN fax_number TEXT;
        COMMENT ON COLUMN public.activity_contacts.fax_number IS 'Local fax number without country code';
    END IF;

END $$;

-- Migrate existing phone data to new format
-- Split existing phone numbers into country code and local number
UPDATE public.activity_contacts 
SET 
    country_code = CASE 
        WHEN phone ~ '^\+\d+' THEN 
            CASE 
                WHEN phone LIKE '+95%' THEN '+95'
                WHEN phone LIKE '+1%' THEN '+1'
                WHEN phone LIKE '+44%' THEN '+44'
                WHEN phone LIKE '+33%' THEN '+33'
                WHEN phone LIKE '+49%' THEN '+49'
                WHEN phone LIKE '+81%' THEN '+81'
                WHEN phone LIKE '+86%' THEN '+86'
                WHEN phone LIKE '+91%' THEN '+91'
                WHEN phone LIKE '+61%' THEN '+61'
                WHEN phone LIKE '+55%' THEN '+55'
                ELSE '+95' -- Default to Myanmar
            END
        ELSE '+95' -- Default to Myanmar for non-international numbers
    END,
    phone_number = CASE 
        WHEN phone ~ '^\+\d+' THEN 
            CASE 
                WHEN phone LIKE '+95%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+1%' THEN TRIM(SUBSTRING(phone FROM 3))
                WHEN phone LIKE '+44%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+33%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+49%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+81%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+86%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+91%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+61%' THEN TRIM(SUBSTRING(phone FROM 4))
                WHEN phone LIKE '+55%' THEN TRIM(SUBSTRING(phone FROM 4))
                ELSE phone -- Keep as is if unknown format
            END
        ELSE phone -- Keep as is for non-international numbers
    END
WHERE phone IS NOT NULL AND phone != '' 
  AND (country_code IS NULL OR phone_number IS NULL);

-- Migrate existing fax data to new format
-- Split existing fax numbers into country code and local number
UPDATE public.activity_contacts 
SET 
    fax_country_code = CASE 
        WHEN fax ~ '^\+\d+' THEN 
            CASE 
                WHEN fax LIKE '+95%' THEN '+95'
                WHEN fax LIKE '+1%' THEN '+1'
                WHEN fax LIKE '+44%' THEN '+44'
                WHEN fax LIKE '+33%' THEN '+33'
                WHEN fax LIKE '+49%' THEN '+49'
                WHEN fax LIKE '+81%' THEN '+81'
                WHEN fax LIKE '+86%' THEN '+86'
                WHEN fax LIKE '+91%' THEN '+91'
                WHEN fax LIKE '+61%' THEN '+61'
                WHEN fax LIKE '+55%' THEN '+55'
                ELSE '+95' -- Default to Myanmar
            END
        ELSE '+95' -- Default to Myanmar for non-international numbers
    END,
    fax_number = CASE 
        WHEN fax ~ '^\+\d+' THEN 
            CASE 
                WHEN fax LIKE '+95%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+1%' THEN TRIM(SUBSTRING(fax FROM 3))
                WHEN fax LIKE '+44%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+33%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+49%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+81%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+86%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+91%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+61%' THEN TRIM(SUBSTRING(fax FROM 4))
                WHEN fax LIKE '+55%' THEN TRIM(SUBSTRING(fax FROM 4))
                ELSE fax -- Keep as is if unknown format
            END
        ELSE fax -- Keep as is for non-international numbers
    END
WHERE fax IS NOT NULL AND fax != '' 
  AND (fax_country_code IS NULL OR fax_number IS NULL);
