-- ============================================================================
-- FIX: Field Trips insert blocked by RLS
-- ============================================================================
-- Run in the Supabase SQL Editor for project lhiayyjwkjkjkxvhcenw.
--
-- Symptom: "new row violates row-level security policy for table
-- 'location_field_reports'". Cause: the original broken APPLY script created
-- the tables and ENABLED RLS, then died before creating any policies — so
-- RLS is on with zero policies = every insert denied.
--
-- This disables RLS on both tables (consistent with the sibling editor tables
-- activity_locat1ions / activity_documents in this deployment, where auth is
-- enforced at the API layer via requireAuth()), drops any half-created
-- policies, ensures grants, and reloads the PostgREST schema cache.
-- Idempotent — safe to re-run.
-- ============================================================================

ALTER TABLE location_field_reports            DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_field_report_attachments DISABLE ROW LEVEL SECURITY;

-- Drop any policies a partial earlier run may have left behind (no-ops if absent).
DROP POLICY IF EXISTS "View location field reports"               ON location_field_reports;
DROP POLICY IF EXISTS "Insert location field reports"             ON location_field_reports;
DROP POLICY IF EXISTS "Update location field reports"             ON location_field_reports;
DROP POLICY IF EXISTS "Delete location field reports"             ON location_field_reports;
DROP POLICY IF EXISTS "View location field report attachments"    ON location_field_report_attachments;
DROP POLICY IF EXISTS "Insert location field report attachments"  ON location_field_report_attachments;
DROP POLICY IF EXISTS "Update location field report attachments"  ON location_field_report_attachments;
DROP POLICY IF EXISTS "Delete location field report attachments"  ON location_field_report_attachments;

GRANT SELECT, INSERT, UPDATE, DELETE ON location_field_reports            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON location_field_report_attachments TO authenticated;
GRANT SELECT                         ON location_field_reports            TO anon;
GRANT SELECT                         ON location_field_report_attachments TO anon;
GRANT ALL                            ON location_field_reports            TO service_role;
GRANT ALL                            ON location_field_report_attachments TO service_role;

NOTIFY pgrst, 'reload schema';
