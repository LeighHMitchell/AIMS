-- Add organization_id column to users table to support direct organization assignment
-- This allows users to have a primary organization association

DO $$ 
BEGIN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'organization_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
        COMMENT ON COLUMN public.users.organization_id IS 'Primary organization association for the user';
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id) WHERE organization_id IS NOT NULL;

-- Grant UPDATE permission on organization_id to authenticated users
GRANT UPDATE (organization_id) ON public.users TO authenticated;

-- Show status
SELECT 
    'Organization ID column added to users table!' as status,
    'Users can now have a direct primary organization association' as message;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'organization_id';
