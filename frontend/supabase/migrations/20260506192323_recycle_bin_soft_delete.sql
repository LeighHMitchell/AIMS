-- Recycle Bin foundation: add deleted_at + deleted_by to every user-deletable
-- table and its child tables. Phase 1 of the 30-day recovery feature.
-- Behavior is unchanged at this point: nothing reads or writes these columns
-- yet. The conversion to soft-delete and the cleanup cron arrive in PR 2 / PR 3.
--
-- Notes:
--   * `auth.users(id)` matches the existing `created_by` / `updated_by` FK pattern.
--   * `archived_at` columns on comments, feedback, notifications, and
--     task_assignments are intentionally NOT touched -- they represent a
--     separate "user archived" intent, not a recoverable delete.
--   * Indexes are partial (WHERE deleted_at IS NOT NULL) so they only cover
--     the recycle-bin sweep query. Active reads still hit existing indexes.

BEGIN;

-- =====================================================================
-- Helper: add deleted_at + deleted_by + partial index to a table.
-- =====================================================================
CREATE OR REPLACE FUNCTION pg_temp.add_recycle_bin_columns(target_table regclass)
RETURNS void AS $$
DECLARE
  qualified_name text := target_table::text;
  unqualified_name text := split_part(qualified_name, '.', 2);
  table_only text := COALESCE(NULLIF(unqualified_name, ''), qualified_name);
  index_name text := 'idx_' || table_only || '_deleted_at';
BEGIN
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
    qualified_name
  );
  EXECUTE format(
    'ALTER TABLE %s ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL',
    qualified_name
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %s(deleted_at) WHERE deleted_at IS NOT NULL',
    index_name, qualified_name
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Top-level entities (users delete these directly from the UI).
-- =====================================================================
SELECT pg_temp.add_recycle_bin_columns('public.activities');
SELECT pg_temp.add_recycle_bin_columns('public.transactions');
SELECT pg_temp.add_recycle_bin_columns('public.organizations');
SELECT pg_temp.add_recycle_bin_columns('public.contacts');
SELECT pg_temp.add_recycle_bin_columns('public.tasks');

-- =====================================================================
-- Activity child tables. When an activity is soft-deleted these rows
-- are also marked with the same deleted_at timestamp so a restore brings
-- the entire activity back intact.
-- =====================================================================
SELECT pg_temp.add_recycle_bin_columns('public.activity_budgets');
SELECT pg_temp.add_recycle_bin_columns('public.activity_results');
SELECT pg_temp.add_recycle_bin_columns('public.result_indicators');
SELECT pg_temp.add_recycle_bin_columns('public.indicator_baselines');
SELECT pg_temp.add_recycle_bin_columns('public.indicator_periods');
SELECT pg_temp.add_recycle_bin_columns('public.activity_sectors');
SELECT pg_temp.add_recycle_bin_columns('public.activity_locations');
SELECT pg_temp.add_recycle_bin_columns('public.activity_contacts');
SELECT pg_temp.add_recycle_bin_columns('public.activity_documents');
SELECT pg_temp.add_recycle_bin_columns('public.activity_tags');
SELECT pg_temp.add_recycle_bin_columns('public.activity_policy_markers');
SELECT pg_temp.add_recycle_bin_columns('public.activity_participating_organizations');
SELECT pg_temp.add_recycle_bin_columns('public.project_references');
SELECT pg_temp.add_recycle_bin_columns('public.planned_disbursements');
SELECT pg_temp.add_recycle_bin_columns('public.country_budget_items');
SELECT pg_temp.add_recycle_bin_columns('public.humanitarian_scope');

-- =====================================================================
-- Task child tables. task_assignments already has archived_at for a
-- different purpose; we add a separate deleted_at for recycle-bin use.
-- =====================================================================
SELECT pg_temp.add_recycle_bin_columns('public.task_assignments');
SELECT pg_temp.add_recycle_bin_columns('public.task_assignment_history');
SELECT pg_temp.add_recycle_bin_columns('public.task_shares');

DROP FUNCTION pg_temp.add_recycle_bin_columns(regclass);

COMMIT;
