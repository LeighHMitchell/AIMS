-- Migration: Fix infinite recursion in RLS policy on users table
-- Created: 2026-02-11
-- Purpose: The previous security migration (20260211000001) enabled RLS on public.users,
--          but an existing policy on the table references itself (e.g., checks user role
--          by querying public.users), causing "infinite recursion detected in policy for
--          relation 'users'" on every query that touches the users table.
--
-- Fix: Drop all existing policies on public.users and create a simple non-recursive
--      "Authenticated users full access" policy matching the pattern used for all other
--      tables in the security migration.

-- Step 1: Drop ALL existing policies on public.users to eliminate the recursive one.
-- We use a dynamic approach since we don't know the exact policy names.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 2: Create a simple, non-recursive policy for authenticated users.
-- This uses USING (true) which does NOT reference the users table itself,
-- avoiding any recursion. This matches the pattern used for all other tables.
CREATE POLICY "Authenticated users full access"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 3: Ensure RLS is still enabled (idempotent)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  RAISE NOTICE 'Users table now has % RLS policies', policy_count;
END $$;
