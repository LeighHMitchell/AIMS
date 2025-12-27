-- Add auth_provider column to track how users authenticate
-- This allows us to hide "Reset Password" for OAuth users

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- Add comment for documentation
COMMENT ON COLUMN public.users.auth_provider IS 
'Authentication provider: email (password), google (OAuth), apple (OAuth)';

-- Create index for filtering by auth provider
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);

-- Update existing users based on their ACTUAL auth provider from Supabase auth.identities
-- This correctly identifies OAuth users regardless of their email domain
UPDATE public.users u
SET auth_provider = 'google'
FROM auth.identities i
WHERE u.id = i.user_id 
  AND i.provider = 'google'
  AND (u.auth_provider IS NULL OR u.auth_provider = 'email');

