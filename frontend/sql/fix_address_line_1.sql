-- Fix missing address_line_1 column (the migration had a syntax error)
-- Run this in Supabase SQL Editor

-- Add address_line_1 if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
COMMENT ON COLUMN public.users.address_line_1 IS 'First line of address (building name, office, etc.)';

-- Verify all address columns exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state_province TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Grant update permissions
GRANT UPDATE (address_line_1, address_line_2, city, state_province, country, postal_code) ON public.users TO authenticated;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('address_line_1', 'address_line_2', 'city', 'state_province', 'country', 'postal_code', 'mailing_address')
ORDER BY column_name;
