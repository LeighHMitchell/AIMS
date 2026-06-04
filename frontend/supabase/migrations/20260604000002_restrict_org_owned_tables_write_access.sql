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

-- Drop every existing policy on the six tables, ensure RLS is on
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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- organization_documents
CREATE POLICY "Authenticated can read organization_documents" ON public.organization_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org editors can insert organization_documents" ON public.organization_documents
  FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can update organization_documents" ON public.organization_documents
  FOR UPDATE TO authenticated USING (public.user_can_edit_organization(organization_id))
  WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can delete organization_documents" ON public.organization_documents
  FOR DELETE TO authenticated USING (public.user_can_edit_organization(organization_id));

-- organization_budgets
CREATE POLICY "Authenticated can read organization_budgets" ON public.organization_budgets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org editors can insert organization_budgets" ON public.organization_budgets
  FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can update organization_budgets" ON public.organization_budgets
  FOR UPDATE TO authenticated USING (public.user_can_edit_organization(organization_id))
  WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can delete organization_budgets" ON public.organization_budgets
  FOR DELETE TO authenticated USING (public.user_can_edit_organization(organization_id));

-- organization_administrative_mappings
CREATE POLICY "Authenticated can read organization_administrative_mappings" ON public.organization_administrative_mappings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org editors can insert organization_administrative_mappings" ON public.organization_administrative_mappings
  FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can update organization_administrative_mappings" ON public.organization_administrative_mappings
  FOR UPDATE TO authenticated USING (public.user_can_edit_organization(organization_id))
  WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can delete organization_administrative_mappings" ON public.organization_administrative_mappings
  FOR DELETE TO authenticated USING (public.user_can_edit_organization(organization_id));

-- organization_funding_source_mappings
CREATE POLICY "Authenticated can read organization_funding_source_mappings" ON public.organization_funding_source_mappings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org editors can insert organization_funding_source_mappings" ON public.organization_funding_source_mappings
  FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can update organization_funding_source_mappings" ON public.organization_funding_source_mappings
  FOR UPDATE TO authenticated USING (public.user_can_edit_organization(organization_id))
  WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can delete organization_funding_source_mappings" ON public.organization_funding_source_mappings
  FOR DELETE TO authenticated USING (public.user_can_edit_organization(organization_id));

-- organization_comments
CREATE POLICY "Authenticated can read organization_comments" ON public.organization_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org editors can insert organization_comments" ON public.organization_comments
  FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can update organization_comments" ON public.organization_comments
  FOR UPDATE TO authenticated USING (public.user_can_edit_organization(organization_id))
  WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can delete organization_comments" ON public.organization_comments
  FOR DELETE TO authenticated USING (public.user_can_edit_organization(organization_id));

-- organization_comment_replies
CREATE POLICY "Authenticated can read organization_comment_replies" ON public.organization_comment_replies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org editors can insert organization_comment_replies" ON public.organization_comment_replies
  FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can update organization_comment_replies" ON public.organization_comment_replies
  FOR UPDATE TO authenticated USING (public.user_can_edit_organization(organization_id))
  WITH CHECK (public.user_can_edit_organization(organization_id));
CREATE POLICY "Org editors can delete organization_comment_replies" ON public.organization_comment_replies
  FOR DELETE TO authenticated USING (public.user_can_edit_organization(organization_id));
