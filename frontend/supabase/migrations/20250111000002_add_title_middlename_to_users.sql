-- Add title and middle_name fields to users table for My Profile functionality
-- This allows users to specify titles (Mr./Ms./Dr./etc.) and middle names

DO $$ 
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'title'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN title TEXT;
        COMMENT ON COLUMN public.users.title IS 'User title (Mr., Ms., Dr., Prof., etc.)';
    END IF;

    -- Add middle_name column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'middle_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN middle_name TEXT;
        COMMENT ON COLUMN public.users.middle_name IS 'User middle name';
    END IF;

END $$;

-- Update any existing RLS policies to include the new fields
-- Grant permissions for users to update the new profile fields
DO $$
BEGIN
    -- Check if authenticated role exists before granting permissions
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT UPDATE (title, middle_name) ON public.users TO authenticated';
    END IF;
END $$;
