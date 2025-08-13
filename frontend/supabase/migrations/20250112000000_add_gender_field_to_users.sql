-- Add gender field to users table
-- This migration adds a gender field to support user profile information

DO $$ 
BEGIN
    -- Add gender column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'gender'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN gender TEXT;
        COMMENT ON COLUMN public.users.gender IS 'User gender (male, female, non-binary, other, or empty for prefer not to say)';
    END IF;

END $$;

-- Grant UPDATE permissions for the gender field to authenticated users
DO $$
BEGIN
    -- Check if authenticated role exists before granting permissions
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT UPDATE (gender) ON public.users TO authenticated';
    END IF;
END $$;
