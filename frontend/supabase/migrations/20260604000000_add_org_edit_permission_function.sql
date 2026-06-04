-- Reusable predicate for org-scoped RLS write policies.
--
-- Returns true when the current user may edit the given organisation:
--   * a super_user, OR
--   * linked via users.organization_id (legacy model), OR
--   * a member via the user_organizations junction.
--
-- SECURITY DEFINER so the membership lookup is not itself subject to the
-- users / user_organizations RLS (and avoids any users-RLS recursion). auth.uid()
-- still resolves to the calling user. STABLE: no writes, safe to inline in policies.

CREATE OR REPLACE FUNCTION public.user_can_edit_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND (u.role = 'super_user' OR u.organization_id = org_id)
  ) OR EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid() AND uo.organization_id = org_id
  );
$$;

-- Allow authenticated users (and the anon role, harmlessly) to call it from policies
GRANT EXECUTE ON FUNCTION public.user_can_edit_organization(uuid) TO authenticated, anon;
