-- =====================================================
-- DIAGNOSTIC SCRIPT: Organization Image Save Issues
-- =====================================================
-- Run this in your PRODUCTION Supabase SQL Editor
-- to diagnose why banner/logo images aren't persisting
-- =====================================================

-- 1. CHECK IF LOGO AND BANNER COLUMNS EXIST
-- =====================================================
SELECT '=== 1. COLUMN CHECK ===' as section;

SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'organizations'
AND column_name IN ('logo', 'banner', 'logo_scale', 'banner_position')
ORDER BY column_name;

-- If this returns 0 rows for logo/banner, the columns are missing!


-- 2. CHECK RLS STATUS ON ORGANIZATIONS TABLE
-- =====================================================
SELECT '=== 2. RLS STATUS ===' as section;

SELECT
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'organizations';

-- If rowsecurity = true, RLS is enabled and policies matter


-- 3. CHECK ALL RLS POLICIES ON ORGANIZATIONS
-- =====================================================
SELECT '=== 3. RLS POLICIES ===' as section;

SELECT
    policyname as "Policy Name",
    permissive as "Permissive",
    roles as "Roles",
    cmd as "Command (SELECT/INSERT/UPDATE/DELETE)",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

-- Look for UPDATE policies - if none exist and RLS is enabled, updates will fail silently


-- 4. CHECK SAMPLE DATA - DO ANY ORGS HAVE IMAGES?
-- =====================================================
SELECT '=== 4. SAMPLE IMAGE DATA ===' as section;

SELECT
    id,
    name,
    CASE WHEN logo IS NOT NULL AND logo != '' THEN 'YES (' || LENGTH(logo) || ' chars)' ELSE 'NO' END as "Has Logo",
    CASE WHEN banner IS NOT NULL AND banner != '' THEN 'YES (' || LENGTH(banner) || ' chars)' ELSE 'NO' END as "Has Banner",
    logo_scale,
    banner_position,
    updated_at
FROM organizations
ORDER BY updated_at DESC
LIMIT 10;


-- 5. CHECK FOR ANY CONSTRAINTS ON THE TABLE
-- =====================================================
SELECT '=== 5. TABLE CONSTRAINTS ===' as section;

SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'organizations'
AND tc.table_schema = 'public';


-- 6. CHECK FOR TRIGGERS THAT MIGHT INTERFERE
-- =====================================================
SELECT '=== 6. TRIGGERS ===' as section;

SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'organizations';


-- 7. TEST UPDATE CAPABILITY (DRY RUN)
-- =====================================================
SELECT '=== 7. TEST UPDATE (read-only check) ===' as section;

-- This checks if the current user can see any organizations
SELECT
    COUNT(*) as "Organizations visible to current user"
FROM organizations;


-- =====================================================
-- FIXES (UNCOMMENT AND RUN IF NEEDED)
-- =====================================================

-- FIX 1: Add missing columns if they don't exist
-- =====================================================
/*
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS banner TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_scale INTEGER DEFAULT 100;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS banner_position INTEGER DEFAULT 50;

COMMENT ON COLUMN organizations.logo IS 'Base64-encoded logo image';
COMMENT ON COLUMN organizations.banner IS 'Base64-encoded banner image';
COMMENT ON COLUMN organizations.logo_scale IS 'Scale percentage (50-150) for logo zoom';
COMMENT ON COLUMN organizations.banner_position IS 'Y position percentage (0-100) for banner cropping';
*/


-- FIX 2: Add UPDATE policy if missing (run if RLS is enabled but no UPDATE policy exists)
-- =====================================================
/*
-- Option A: Allow all authenticated users to update any organization
CREATE POLICY "Authenticated users can update organizations"
ON organizations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
*/

/*
-- Option B: More restrictive - only allow users to update their own organization
CREATE POLICY "Users can update their own organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
);
*/


-- FIX 3: Disable RLS temporarily for testing (NOT RECOMMENDED FOR PRODUCTION)
-- =====================================================
/*
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
-- Test your upload, then re-enable:
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
*/
