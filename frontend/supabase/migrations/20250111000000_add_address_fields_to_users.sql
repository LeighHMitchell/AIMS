-- Add address line fields and other missing profile fields to users table
-- This migration adds support for the new address structure in the profile component

DO $$ 
BEGIN
    -- Add address line fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'address_line_1'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN address_line_1 TEXT;
        COMMENT ON COLUMN public.users.address_line_1 IS 'First line of address (street, building number)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'address_line_2'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN address_line_2 TEXT;
        COMMENT ON COLUMN public.users.address_line_2 IS 'Second line of address (apartment, suite, etc.)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'city'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN city TEXT;
        COMMENT ON COLUMN public.users.city IS 'City or town';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'state_province'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN state_province TEXT;
        COMMENT ON COLUMN public.users.state_province IS 'State, province, or region';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'country'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN country TEXT;
        COMMENT ON COLUMN public.users.country IS 'Country';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'postal_code'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN postal_code TEXT;
        COMMENT ON COLUMN public.users.postal_code IS 'Postal or ZIP code';
    END IF;

    -- Add other missing profile fields if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'first_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
        COMMENT ON COLUMN public.users.first_name IS 'User first name';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
        COMMENT ON COLUMN public.users.last_name IS 'User last name';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'job_title'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN job_title TEXT;
        COMMENT ON COLUMN public.users.job_title IS 'User job title';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'department'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN department TEXT;
        COMMENT ON COLUMN public.users.department IS 'User department';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'telephone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN telephone TEXT;
        COMMENT ON COLUMN public.users.telephone IS 'User phone number with country code';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'website'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN website TEXT;
        COMMENT ON COLUMN public.users.website IS 'User personal/professional website';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'mailing_address'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN mailing_address TEXT;
        COMMENT ON COLUMN public.users.mailing_address IS 'Complete mailing address (for backward compatibility)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'bio'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN bio TEXT;
        COMMENT ON COLUMN public.users.bio IS 'User biography/description';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preferred_language'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN preferred_language TEXT DEFAULT 'en';
        COMMENT ON COLUMN public.users.preferred_language IS 'User preferred language (ISO 639-1 code)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'timezone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN timezone TEXT DEFAULT 'UTC';
        COMMENT ON COLUMN public.users.timezone IS 'User preferred timezone';
    END IF;
END $$;

-- Grant UPDATE permissions for all profile fields to authenticated users
GRANT UPDATE (
    address_line_1, address_line_2, city, state_province, country, postal_code,
    first_name, last_name, job_title, department, telephone, website, 
    mailing_address, bio, preferred_language, timezone
) ON users TO authenticated;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_city ON public.users(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(first_name, last_name) WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

-- Show status
SELECT 
    'Address fields migration completed!' as status,
    'Users table now supports detailed address breakdown and all profile fields' as message;

-- Verify the new columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN (
    'address_line_1', 'address_line_2', 'city', 'state_province', 
    'country', 'postal_code', 'first_name', 'last_name', 'job_title', 
    'department', 'telephone', 'website', 'mailing_address', 'bio', 
    'preferred_language', 'timezone'
)
ORDER BY column_name;
