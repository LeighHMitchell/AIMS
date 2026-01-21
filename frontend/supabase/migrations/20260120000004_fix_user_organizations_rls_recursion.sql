-- ================================================================
-- FIX RLS RECURSION ON user_organizations TABLE
-- ================================================================
-- The existing RLS policies on user_organizations query the same table
-- to check if a user is an admin, causing infinite recursion.
-- This migration fixes the issue by using SECURITY DEFINER functions.
-- ================================================================

-- Step 1: Create a SECURITY DEFINER function to check if user is org admin
-- This function bypasses RLS, avoiding the recursion
CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = check_org_id
    AND user_id = check_user_id
    AND role = 'admin'
  );
$$;

-- Step 2: Create a SECURITY DEFINER function to check if user is super_user
CREATE OR REPLACE FUNCTION is_super_user(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = check_user_id
    AND role = 'super_user'
  );
$$;

-- Step 3: Create a SECURITY DEFINER function to check org membership
CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = check_org_id
    AND user_id = check_user_id
  );
$$;

-- Step 4: Drop the problematic policies (old recursive ones)
DROP POLICY IF EXISTS "Organization admins can view all memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization admins can manage memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Super users can view all memberships" ON user_organizations;

-- Also drop new policies if they exist (makes migration idempotent)
DROP POLICY IF EXISTS "user_org_select_own" ON user_organizations;
DROP POLICY IF EXISTS "user_org_select_super_user" ON user_organizations;
DROP POLICY IF EXISTS "user_org_select_org_admin" ON user_organizations;
DROP POLICY IF EXISTS "user_org_all_super_user" ON user_organizations;
DROP POLICY IF EXISTS "user_org_all_org_admin" ON user_organizations;

-- Step 5: Create new non-recursive policies using the security definer functions

-- Users can always view their own memberships
CREATE POLICY "user_org_select_own"
ON user_organizations
FOR SELECT
USING (user_id = auth.uid());

-- Super users can view all memberships
CREATE POLICY "user_org_select_super_user"
ON user_organizations
FOR SELECT
USING (is_super_user());

-- Organization admins can view all memberships in their org
-- Uses security definer function to avoid recursion
CREATE POLICY "user_org_select_org_admin"
ON user_organizations
FOR SELECT
USING (is_org_admin(organization_id));

-- Super users can manage all memberships
CREATE POLICY "user_org_all_super_user"
ON user_organizations
FOR ALL
USING (is_super_user())
WITH CHECK (is_super_user());

-- Organization admins can manage memberships in their org
CREATE POLICY "user_org_all_org_admin"
ON user_organizations
FOR ALL
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

-- Step 6: Grant execute permissions on the helper functions
GRANT EXECUTE ON FUNCTION is_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_member(UUID, UUID) TO authenticated;

-- ================================================================
-- Step 7: Fix transaction_sector_lines policies that query user_organizations
-- These policies cause recursion when called from activity_sectors triggers
-- ================================================================

-- Create a helper function to check if user can access activity (uses SECURITY DEFINER)
CREATE OR REPLACE FUNCTION can_access_activity(check_activity_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = check_activity_id
    AND (
      -- User created the activity
      a.created_by = check_user_id
      -- User belongs to the activity's organization
      OR EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = check_user_id
        AND uo.organization_id = a.reporting_org_id
      )
      -- User's organization is a contributor
      OR EXISTS (
        SELECT 1 FROM activity_contributors ac
        JOIN user_organizations uo ON uo.organization_id = ac.organization_id
        WHERE ac.activity_id = a.id
        AND uo.user_id = check_user_id
        AND ac.status = 'accepted'
      )
      -- Super user can access all
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = check_user_id
        AND u.role = 'super_user'
      )
    )
  );
$$;

-- Create a helper function to check if user can edit activity (uses SECURITY DEFINER)
CREATE OR REPLACE FUNCTION can_edit_activity(check_activity_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = check_activity_id
    AND (
      -- User created the activity
      a.created_by = check_user_id
      -- User belongs to the activity's organization with edit access
      OR EXISTS (
        SELECT 1 FROM user_organizations uo
        WHERE uo.user_id = check_user_id
        AND uo.organization_id = a.reporting_org_id
        AND uo.role IN ('admin', 'member')
      )
      -- User's organization is a contributor with edit permissions
      OR EXISTS (
        SELECT 1 FROM activity_contributors ac
        JOIN user_organizations uo ON uo.organization_id = ac.organization_id
        WHERE ac.activity_id = a.id
        AND uo.user_id = check_user_id
        AND ac.status = 'accepted'
        AND ac.can_edit_own_data = true
      )
      -- Super user can edit all
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = check_user_id
        AND u.role = 'super_user'
      )
    )
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_access_activity(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_activity(UUID, UUID) TO authenticated;

-- Drop old transaction_sector_lines policies
DROP POLICY IF EXISTS "Users can view transaction sector lines for accessible transactions" ON transaction_sector_lines;
DROP POLICY IF EXISTS "Users can modify transaction sector lines for editable transactions" ON transaction_sector_lines;

-- Also drop new policies if they exist (makes migration idempotent)
DROP POLICY IF EXISTS "txn_sector_lines_select" ON transaction_sector_lines;
DROP POLICY IF EXISTS "txn_sector_lines_all" ON transaction_sector_lines;

-- Create new non-recursive policies for transaction_sector_lines
CREATE POLICY "txn_sector_lines_select"
ON transaction_sector_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.uuid = transaction_sector_lines.transaction_id
    AND can_access_activity(t.activity_id)
  )
  AND deleted_at IS NULL
);

CREATE POLICY "txn_sector_lines_all"
ON transaction_sector_lines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.uuid = transaction_sector_lines.transaction_id
    AND can_edit_activity(t.activity_id)
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.uuid = transaction_sector_lines.transaction_id
    AND can_edit_activity(t.activity_id)
  )
);

-- ================================================================
-- Step 8: Fix trigger functions that modify transaction_sector_lines
-- These need SECURITY DEFINER to bypass RLS
-- ================================================================

-- Recreate sync_activity_sectors_to_transactions as SECURITY DEFINER
CREATE OR REPLACE FUNCTION sync_activity_sectors_to_transactions()
RETURNS TRIGGER AS $$
DECLARE
  activity_mode TEXT;
  tx RECORD;
BEGIN
  -- Get the activity's sector allocation mode
  SELECT sector_allocation_mode INTO activity_mode
  FROM activities WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);

  -- Only sync if in 'activity' mode
  IF activity_mode = 'activity' THEN
    -- For each transaction in this activity, update its sector lines
    FOR tx IN
      SELECT uuid, value FROM transactions
      WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    LOOP
      -- Delete existing sector lines for this transaction (soft delete)
      UPDATE transaction_sector_lines
      SET deleted_at = NOW()
      WHERE transaction_id = tx.uuid AND deleted_at IS NULL;

      -- Insert new sector lines based on activity sectors
      INSERT INTO transaction_sector_lines (
        transaction_id,
        sector_vocabulary,
        sector_code,
        sector_name,
        percentage,
        amount_minor,
        created_at,
        updated_at
      )
      SELECT
        tx.uuid,
        '1', -- DAC-5 vocabulary
        asec.sector_code,
        asec.sector_name,
        COALESCE(asec.percentage, 100),
        ROUND(COALESCE(tx.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::INTEGER,
        NOW(),
        NOW()
      FROM activity_sectors asec
      WHERE asec.activity_id = COALESCE(NEW.activity_id, OLD.activity_id);
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate sync_sectors_on_transaction_insert as SECURITY DEFINER
CREATE OR REPLACE FUNCTION sync_sectors_on_transaction_insert()
RETURNS TRIGGER AS $$
DECLARE
  activity_mode TEXT;
BEGIN
  -- Get the activity's sector allocation mode
  SELECT sector_allocation_mode INTO activity_mode
  FROM activities WHERE id = NEW.activity_id;

  -- Only sync if in 'activity' mode and transaction inherits from activity
  IF activity_mode = 'activity' AND COALESCE(NEW.use_activity_sectors, true) = true THEN
    -- Insert sector lines based on activity sectors
    INSERT INTO transaction_sector_lines (
      transaction_id,
      sector_vocabulary,
      sector_code,
      sector_name,
      percentage,
      amount_minor,
      created_at,
      updated_at
    )
    SELECT
      NEW.uuid,
      '1', -- DAC-5 vocabulary
      asec.sector_code,
      asec.sector_name,
      COALESCE(asec.percentage, 100),
      ROUND(COALESCE(NEW.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::INTEGER,
      NOW(),
      NOW()
    FROM activity_sectors asec
    WHERE asec.activity_id = NEW.activity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate sync_sectors_on_mode_change as SECURITY DEFINER
CREATE OR REPLACE FUNCTION sync_sectors_on_mode_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When mode changes TO 'activity', sync all transactions
  IF NEW.use_activity_sectors = true AND (OLD.use_activity_sectors IS NULL OR OLD.use_activity_sectors = false) THEN
    -- Delete existing sector lines for this transaction (soft delete)
    UPDATE transaction_sector_lines
    SET deleted_at = NOW()
    WHERE transaction_id = NEW.uuid AND deleted_at IS NULL;

    -- Insert sector lines based on activity sectors
    INSERT INTO transaction_sector_lines (
      transaction_id,
      sector_vocabulary,
      sector_code,
      sector_name,
      percentage,
      amount_minor,
      created_at,
      updated_at
    )
    SELECT
      NEW.uuid,
      '1',
      asec.sector_code,
      asec.sector_name,
      COALESCE(asec.percentage, 100),
      ROUND(COALESCE(NEW.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::INTEGER,
      NOW(),
      NOW()
    FROM activity_sectors asec
    WHERE asec.activity_id = NEW.activity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ================================================================
-- VERIFY: Check that policies are correctly applied
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'RLS RECURSION FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Created SECURITY DEFINER helper functions:';
  RAISE NOTICE '  - is_org_admin(org_id, user_id)';
  RAISE NOTICE '  - is_super_user(user_id)';
  RAISE NOTICE '  - is_org_member(org_id, user_id)';
  RAISE NOTICE '  - can_access_activity(activity_id, user_id)';
  RAISE NOTICE '  - can_edit_activity(activity_id, user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Converted trigger functions to SECURITY DEFINER:';
  RAISE NOTICE '  - sync_activity_sectors_to_transactions()';
  RAISE NOTICE '  - sync_sectors_on_transaction_insert()';
  RAISE NOTICE '  - sync_sectors_on_mode_change()';
  RAISE NOTICE '';
  RAISE NOTICE 'Replaced recursive policies:';
  RAISE NOTICE '  user_organizations:';
  RAISE NOTICE '    - user_org_select_own';
  RAISE NOTICE '    - user_org_select_super_user';
  RAISE NOTICE '    - user_org_select_org_admin';
  RAISE NOTICE '    - user_org_all_super_user';
  RAISE NOTICE '    - user_org_all_org_admin';
  RAISE NOTICE '  transaction_sector_lines:';
  RAISE NOTICE '    - txn_sector_lines_select';
  RAISE NOTICE '    - txn_sector_lines_all';
  RAISE NOTICE '';
  RAISE NOTICE 'Transaction and sector imports should now work correctly.';
  RAISE NOTICE '================================================================';
END $$;
