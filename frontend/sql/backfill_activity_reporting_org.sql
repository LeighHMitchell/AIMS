-- Backfill activities.reporting_org_id (the "owning organisation") where it is
-- currently NULL, so that org colleagues — not just the original creator or an
-- admin — can edit those activities under the new permission rules.
--
-- Source of truth: the activity's creator's organisation. This mirrors exactly
-- what the app does when a NEW activity is created (it sets
--   reporting_org_id = creating user's organizations.id
-- in /api/activities POST). We only ever fill NULLs — existing reporting orgs
-- (e.g. set during IATI import) are left untouched.
--
-- created_by may be stored as uuid or text, so we compare as ::text.
--
-- RUN ORDER:
--   1. Run STEP 1 (preview) and read the numbers.
--   2. (Recommended) Run STEP 2 to snapshot the rows you're about to change.
--   3. Run STEP 3 to apply. Re-running is safe (only NULLs are touched).
--   4. Run STEP 4 to confirm.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — PREVIEW (no changes). How many activities are missing an owning org,
-- and how many can be resolved from the creator's organisation?
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  count(*)                                                           AS total_activities,
  count(*) FILTER (WHERE reporting_org_id IS NOT NULL)               AS already_have_owner,
  count(*) FILTER (WHERE reporting_org_id IS NULL)                   AS missing_owner,
  count(*) FILTER (
    WHERE reporting_org_id IS NULL
      AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = activities.created_by::text
          AND u.organization_id IS NOT NULL
      )
  )                                                                  AS fixable_from_creator_org,
  count(*) FILTER (
    WHERE reporting_org_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = activities.created_by::text
          AND u.organization_id IS NOT NULL
      )
  )                                                                  AS still_unresolved
FROM activities;

-- Optional: see the specific rows that WOULD change and which org they'd get.
-- SELECT a.id, a.title_narrative, a.created_by, u.organization_id AS new_reporting_org_id
-- FROM activities a
-- JOIN users u ON u.id::text = a.created_by::text
-- WHERE a.reporting_org_id IS NULL AND u.organization_id IS NOT NULL
-- ORDER BY a.updated_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — (RECOMMENDED) Snapshot the affected rows so the change is reversible.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backfill_reporting_org_backup_20260604 AS
SELECT a.id, a.reporting_org_id AS old_reporting_org_id
FROM activities a
JOIN users u ON u.id::text = a.created_by::text
WHERE a.reporting_org_id IS NULL
  AND u.organization_id IS NOT NULL;

-- To roll back later:
--   UPDATE activities a
--   SET reporting_org_id = b.old_reporting_org_id
--   FROM backfill_reporting_org_backup_20260604 b
--   WHERE a.id = b.id;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — APPLY. Fill the owning org from the creator's organisation (NULLs only).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE activities a
SET reporting_org_id = u.organization_id,
    updated_at = now()
FROM users u
WHERE a.reporting_org_id IS NULL
  AND a.created_by IS NOT NULL
  AND u.id::text = a.created_by::text
  AND u.organization_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — VERIFY. Re-run the preview; missing_owner should now equal the
-- earlier "still_unresolved" count (activities whose creator has no org).
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  count(*) FILTER (WHERE reporting_org_id IS NULL) AS still_missing_owner,
  count(*) FILTER (WHERE reporting_org_id IS NOT NULL) AS have_owner
FROM activities;
