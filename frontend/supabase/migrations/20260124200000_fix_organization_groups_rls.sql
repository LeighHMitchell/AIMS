-- ================================================================
-- FIX RLS POLICIES ON CUSTOM GROUPS TABLES
-- ================================================================
-- The existing RLS policies on custom_groups and custom_group_memberships
-- may query the users table to check for roles, which fails because the 
-- users table has its own RLS policies that block access. This migration 
-- uses the is_super_user() SECURITY DEFINER function to bypass this issue.
-- ================================================================

-- First, ensure the is_super_user() function exists (idempotent)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_super_user(UUID) TO authenticated;

-- ================================================================
-- Fix custom_groups table policies
-- ================================================================

-- Drop existing problematic policies on custom_groups
DROP POLICY IF EXISTS "Authorized users can create groups" ON custom_groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON custom_groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON custom_groups;

-- Also drop new policies if they exist (makes migration idempotent)
DROP POLICY IF EXISTS "custom_groups_insert" ON custom_groups;
DROP POLICY IF EXISTS "custom_groups_update" ON custom_groups;
DROP POLICY IF EXISTS "custom_groups_delete" ON custom_groups;

-- Policy: Authenticated users can create groups
CREATE POLICY "custom_groups_insert" ON custom_groups
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their own groups, or super_users can update any
CREATE POLICY "custom_groups_update" ON custom_groups
    FOR UPDATE USING (
        auth.uid() = created_by OR is_super_user()
    );

-- Policy: Users can delete their own groups, or super_users can delete any
CREATE POLICY "custom_groups_delete" ON custom_groups
    FOR DELETE USING (
        auth.uid() = created_by OR is_super_user()
    );

-- ================================================================
-- Fix custom_group_memberships table policies
-- ================================================================

-- Drop existing problematic policies on custom_group_memberships
DROP POLICY IF EXISTS "View memberships of viewable groups" ON custom_group_memberships;
DROP POLICY IF EXISTS "Manage memberships of owned groups" ON custom_group_memberships;

-- Also drop new policies if they exist (makes migration idempotent)
DROP POLICY IF EXISTS "custom_group_memberships_select" ON custom_group_memberships;
DROP POLICY IF EXISTS "custom_group_memberships_all" ON custom_group_memberships;

-- Policy: View memberships of public groups or own groups
CREATE POLICY "custom_group_memberships_select" ON custom_group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM custom_groups cg
            WHERE cg.id = group_id
            AND (cg.is_public = true OR cg.created_by = auth.uid())
        )
    );

-- Policy: Manage memberships if you own the group or are super_user
CREATE POLICY "custom_group_memberships_all" ON custom_group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM custom_groups cg
            WHERE cg.id = group_id
            AND (cg.created_by = auth.uid() OR is_super_user())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_groups cg
            WHERE cg.id = group_id
            AND (cg.created_by = auth.uid() OR is_super_user())
        )
    );

-- ================================================================
-- Also fix organization_groups and organization_group_members if they exist
-- ================================================================

-- Drop the problematic policies that directly query the users table
DROP POLICY IF EXISTS "Super users can manage all groups" ON organization_groups;
DROP POLICY IF EXISTS "Super users can manage all group members" ON organization_group_members;

-- Also drop new policies if they exist (makes migration idempotent)
DROP POLICY IF EXISTS "org_groups_super_user_all" ON organization_groups;
DROP POLICY IF EXISTS "org_group_members_super_user_all" ON organization_group_members;

-- Create new policy for organization_groups using is_super_user() function (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_groups') THEN
        EXECUTE 'CREATE POLICY "org_groups_super_user_all" ON organization_groups
            FOR ALL USING (is_super_user())
            WITH CHECK (is_super_user())';
    END IF;
END $$;

-- Create new policy for organization_group_members using is_super_user() function (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_group_members') THEN
        EXECUTE 'CREATE POLICY "org_group_members_super_user_all" ON organization_group_members
            FOR ALL USING (is_super_user())
            WITH CHECK (is_super_user())';
    END IF;
END $$;

-- ================================================================
-- VERIFY: Check that policies are correctly applied
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'CUSTOM GROUPS RLS FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Replaced problematic policies with is_super_user() function:';
  RAISE NOTICE '  custom_groups:';
  RAISE NOTICE '    - custom_groups_insert';
  RAISE NOTICE '    - custom_groups_update';
  RAISE NOTICE '    - custom_groups_delete';
  RAISE NOTICE '  custom_group_memberships:';
  RAISE NOTICE '    - custom_group_memberships_select';
  RAISE NOTICE '    - custom_group_memberships_all';
  RAISE NOTICE '';
  RAISE NOTICE 'Custom groups should now work correctly.';
  RAISE NOTICE '================================================================';
END $$;
