-- Migration: Create trigger to automatically sync auth.users to public.users
-- This ensures that when a user signs up via OAuth (Google, Apple, etc.),
-- a corresponding record is created in the public.users table automatically.
--
-- NOTE: This trigger must be created by a Supabase admin or via the Dashboard
-- because it requires access to the auth schema.

-- Function to handle new user creation in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_name TEXT;
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  -- Check if user already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Also check by email (in case of ID mismatch)
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    UPDATE public.users 
    SET id = NEW.id, updated_at = NOW()
    WHERE email = NEW.email;
    RETURN NEW;
  END IF;
  
  -- Extract name from user metadata
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  -- Parse first and last name
  IF full_name != '' AND full_name LIKE '% %' THEN
    first_name_val := split_part(full_name, ' ', 1);
    last_name_val := substring(full_name from position(' ' in full_name) + 1);
  ELSE
    first_name_val := COALESCE(NULLIF(full_name, ''), split_part(NEW.email, '@', 1));
    last_name_val := '';
  END IF;
  
  -- Insert new user into public.users
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    first_name_val,
    last_name_val,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    'dev_partner_tier_2',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    -- Don't fail the auth process, just return
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
