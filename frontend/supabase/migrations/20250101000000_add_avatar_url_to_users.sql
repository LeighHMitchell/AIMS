-- Add avatar_url column to users table for profile photos
-- This migration safely adds the column only if it doesn't exist

DO $$ 
BEGIN
    -- Check if avatar_url column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'avatar_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
        COMMENT ON COLUMN public.users.avatar_url IS 'URL to user profile photo stored in uploads/profiles/';
    END IF;
END $$;

-- Create an index for better performance when querying users with avatars
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON public.users(avatar_url) WHERE avatar_url IS NOT NULL; 