-- Restrict write access on admin-managed reference/config tables to super_users.
--
-- These tables back /admin/ routes but had `true` / `auth.uid() IS NOT NULL`
-- write policies and no role check in their routes, so any authenticated user
-- could edit them. Their routes use the RLS-scoped session client, so gating
-- writes here secures every write path at once (admin-client routes, if any,
-- bypass RLS and are unaffected).
--
-- Decision: super_user only (per product owner). Reads stay authenticated-readable.

-- Reusable super_user predicate (SECURITY DEFINER to avoid users-RLS recursion)
CREATE OR REPLACE FUNCTION public.user_is_super_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_user'
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_super_user() TO authenticated, anon;

-- Apply the same policy set to every admin reference table
DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'aid_effectiveness_options',
    'ae_option_ministries',
    'custom_years',
    'national_development_goals',
    'country_emergencies',
    'domestic_budget_data',
    'project_references'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- drop existing policies
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    -- authenticated read (unchanged from the permissive baseline)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'Authenticated can read ' || tbl, tbl
    );

    -- super_user-only writes
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.user_is_super_user())',
      'Super users can insert ' || tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.user_is_super_user()) WITH CHECK (public.user_is_super_user())',
      'Super users can update ' || tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.user_is_super_user())',
      'Super users can delete ' || tbl, tbl
    );
  END LOOP;
END $$;
