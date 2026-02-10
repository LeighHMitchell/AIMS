-- Migration: Fix organizations table RLS policy
-- Created: 2026-02-11
-- Purpose: The security migration (20260211000001) enabled RLS on the organizations
--          table, assuming it already had permissive policies. However, the existing
--          policies (if any) don't allow INSERT/UPDATE/DELETE for authenticated users,
--          causing "new row violates row-level security policy" errors when creating
--          organizations during IATI bulk import.
--
-- Fix: Drop any existing policies and create a simple permissive policy matching
--      the pattern used for all other tables in the security migration.

-- Step 1: Drop ALL existing policies on public.organizations
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 2: Create a simple, permissive policy for authenticated users
CREATE POLICY "Authenticated users full access"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 3: Ensure RLS is still enabled (idempotent)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organizations';

  RAISE NOTICE 'Organizations table now has % RLS policies', policy_count;
END $$;
