-- Restrict write access on organisation-owned child tables.
--
-- These all had `auth.uid() IS NOT NULL` / `true` write policies (any authenticated
-- user could write any organisation's rows). Their API routes use the RLS-scoped
-- session client, so this was real cross-org exposure. Each table has an
-- organization_id, so we scope writes with user_can_edit_organization().
--
-- SELECT is left as authenticated-readable (unchanged from the permissive baseline).
-- custom_groups is intentionally NOT included here — it is a user-created grouping
-- (created_by ownership), not org-owned, and needs a different predicate.
--
-- Tables missing from this database are skipped (to_regclass guard), so the
-- migration is portable across environments where some child tables don't exist.

DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'organization_documents',
    'organization_budgets',
    'organization_administrative_mappings',
    'organization_funding_source_mappings',
    'organization_comments',
    'organization_comment_replies'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Skip tables that don't exist in this database
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE NOTICE 'Skipping missing table: %', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- drop every existing policy (clean slate, idempotent)
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

    -- org-scoped writes
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_organization(organization_id))',
      'Org editors can insert ' || tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.user_can_edit_organization(organization_id)) WITH CHECK (public.user_can_edit_organization(organization_id))',
      'Org editors can update ' || tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.user_can_edit_organization(organization_id))',
      'Org editors can delete ' || tbl, tbl
    );
  END LOOP;
END $$;
