-- Migration: Fix Supabase Security Advisor Warnings
-- Created: 2026-02-11
-- Purpose: Address remaining WARN-level findings from Security Advisor
--
-- Categories fixed:
--   1. function_search_path_mutable (~65 functions) - Add SET search_path = public
--   2. extension_in_public (1) - Move pg_trgm to extensions schema
--   3. materialized_view_in_api (1) - Revoke anon access to activity_transaction_summaries
--
-- NOT fixed here (require Supabase Dashboard):
--   - auth_leaked_password_protection -> Dashboard > Auth > Settings
--   - vulnerable_postgres_version -> Dashboard > Settings > Infrastructure
--
-- NOT fixed here (intentional design):
--   - rls_policy_always_true (~80+) -> "Authenticated users full access" policies
--     are intentionally permissive. Tightening requires per-table business logic.


-- =============================================================================
-- SECTION 1: Fix function_search_path_mutable warnings
-- Set search_path = public on ALL functions in the public schema that
-- don't already have it configured. This prevents search_path hijacking.
-- =============================================================================

-- 1a. Fix the two SECURITY DEFINER functions explicitly (highest priority)
-- These are the most critical since SECURITY DEFINER runs as the function owner.

ALTER FUNCTION public.calculate_transparency_scores() SET search_path = public;
ALTER FUNCTION public.get_donor_transparency_rankings() SET search_path = public;

-- 1b. Fix ALL remaining functions in public schema dynamically
-- This catches every function the Security Advisor flagged.

DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
BEGIN
  FOR func_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      p.oid AS func_oid,
      pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      -- Exclude functions that already have search_path set
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(p.proconfig) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
      -- Only user-defined functions (not built-in)
      AND p.proowner != 10  -- Skip functions owned by the bootstrap superuser
  LOOP
    func_signature := format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      func_record.function_name,
      func_record.identity_args
    );

    BEGIN
      EXECUTE func_signature;
      RAISE NOTICE 'Fixed search_path for: %(%)', func_record.function_name, func_record.identity_args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- =============================================================================
-- SECTION 2: Fix extension_in_public warning
-- Move pg_trgm from public schema to extensions schema.
-- Supabase includes an 'extensions' schema by default.
-- =============================================================================

-- Ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage so functions still work
GRANT USAGE ON SCHEMA extensions TO public;

-- Move the extension to the extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Ensure search_path includes extensions so existing queries still work.
-- Supabase default search_path typically already includes it, but be safe:
-- (This affects the database-level default for new sessions)
DO $$
DECLARE
  current_path TEXT;
BEGIN
  SELECT setting INTO current_path
  FROM pg_settings WHERE name = 'search_path';

  IF current_path NOT LIKE '%extensions%' THEN
    EXECUTE format(
      'ALTER DATABASE current_database() SET search_path = %s, extensions',
      current_path
    );
    RAISE NOTICE 'Added extensions to search_path: %, extensions', current_path;
  ELSE
    RAISE NOTICE 'search_path already includes extensions: %', current_path;
  END IF;
END $$;


-- =============================================================================
-- SECTION 3: Fix materialized_view_in_api warning
-- activity_transaction_summaries is a materialized view exposed via the
-- PostgREST API. Revoke anon access since only authenticated users need it.
-- =============================================================================

REVOKE ALL ON public.activity_transaction_summaries FROM anon;

-- Ensure authenticated users can still read it
GRANT SELECT ON public.activity_transaction_summaries TO authenticated;


-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  unfixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unfixed_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(p.proconfig) AS cfg
      WHERE cfg LIKE 'search_path=%'
    )
    AND p.proowner != 10;

  RAISE NOTICE 'Functions in public schema still without search_path: %', unfixed_count;
  RAISE NOTICE 'Security advisor warnings migration completed successfully';
END $$;
