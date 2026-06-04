-- Restrict write access on organization_funding_envelopes.
--
-- Previously INSERT/UPDATE/DELETE were allowed for ANY authenticated user
-- (WITH CHECK (auth.uid() IS NOT NULL)), so a logged-in user could edit any
-- organisation's funding envelopes. This tightens writes to users who are
-- actually tied to the target organisation, mirroring the pattern already used
-- by organization_contacts (legacy users.organization_id) and the newer
-- user_organizations junction, with a super_user bypass.
--
-- SELECT stays public (transparency) — only the write policies change.

-- Remove the permissive write policies
DROP POLICY IF EXISTS "Authenticated users can insert funding envelopes" ON organization_funding_envelopes;
DROP POLICY IF EXISTS "Authenticated users can update funding envelopes" ON organization_funding_envelopes;
DROP POLICY IF EXISTS "Authenticated users can delete funding envelopes" ON organization_funding_envelopes;

-- INSERT: the new row's organisation must be one the user may edit
CREATE POLICY "Org editors can insert funding envelopes"
  ON organization_funding_envelopes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_user' OR u.organization_id = organization_funding_envelopes.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_funding_envelopes.organization_id
    )
  );

-- UPDATE: user must be able to edit both the existing row's org (USING) and the
-- resulting row's org (WITH CHECK), preventing moving a row to another org
CREATE POLICY "Org editors can update funding envelopes"
  ON organization_funding_envelopes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_user' OR u.organization_id = organization_funding_envelopes.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_funding_envelopes.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_user' OR u.organization_id = organization_funding_envelopes.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_funding_envelopes.organization_id
    )
  );

-- DELETE: user must be able to edit the row's org
CREATE POLICY "Org editors can delete funding envelopes"
  ON organization_funding_envelopes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_user' OR u.organization_id = organization_funding_envelopes.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_funding_envelopes.organization_id
    )
  );
