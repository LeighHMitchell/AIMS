-- Add missing columns that the profile form is trying to update
-- This will fix the "Could not find the 'timezone' column" error

-- Add the missing columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Grant permissions for these new columns
GRANT UPDATE (timezone, bio, preferred_language) ON users TO authenticated;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('timezone', 'bio', 'preferred_language')
ORDER BY column_name;

-- Show the complete profile update should now work
SELECT 
  'Profile update should now work!' as status,
  'Missing columns have been added' as message;
