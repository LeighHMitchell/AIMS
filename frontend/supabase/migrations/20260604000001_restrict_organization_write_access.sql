-- Restrict write access on the organizations table.
--
-- 20260211000004 set `FOR ALL TO authenticated USING(true) WITH CHECK(true)`,
-- so ANY authenticated user can edit or delete ANY organisation. The interactive
-- editor route (/api/organizations/[id], RLS-scoped session client) relies on
-- this, so it was wide open. IATI bulk import uses the admin client (bypasses
-- RLS), so it is unaffected by the tightening below.
--
-- Policy:
--   SELECT  — any authenticated user (unchanged read access)
--   INSERT  — any authenticated user (preserves org creation / bulk import paths)
--   UPDATE  — super_user, or a member of THAT organisation
--   DELETE  — super_user, or a member of THAT organisation
-- (The app soft-deletes orgs via an UPDATE, so the UPDATE policy is the real gate;
--  the DELETE policy is defense-in-depth for any hard delete.)

-- Drop all existing policies on organizations (clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org editors can update organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.user_can_edit_organization(organizations.id))
  WITH CHECK (public.user_can_edit_organization(organizations.id));

CREATE POLICY "Org editors can delete organizations"
  ON public.organizations FOR DELETE TO authenticated
  USING (public.user_can_edit_organization(organizations.id));
