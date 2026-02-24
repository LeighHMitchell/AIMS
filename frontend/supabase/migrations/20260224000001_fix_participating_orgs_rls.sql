-- Migration: Fix RLS on activity_participating_organizations
-- Created: 2026-02-24
-- Purpose: The activity_participating_organizations table was missed in the
--   20260211 security hardening migration. It has restrictive RLS policies
--   that prevent authenticated users from inserting records unless they are
--   the activity creator or part of the reporting org. This adds the same
--   blanket "Authenticated users full access" policy used on all other tables.

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Users can view participating organizations for activities they can access"
    ON activity_participating_organizations;

DROP POLICY IF EXISTS "Activity creators can manage participating organizations"
    ON activity_participating_organizations;

-- Add the standard permissive policy (matches all other tables)
CREATE POLICY "Authenticated users full access"
    ON activity_participating_organizations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure RLS is enabled (it already should be, but be safe)
ALTER TABLE activity_participating_organizations ENABLE ROW LEVEL SECURITY;
