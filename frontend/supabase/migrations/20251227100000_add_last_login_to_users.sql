-- Add last_login column to users table
-- This column tracks when a user last logged in

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of the user''s most recent login';

-- Create an index for efficient queries on last_login (e.g., for admin reporting)
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login);

