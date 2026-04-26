-- Backfill provider_org_id / receiver_org_id on transactions and planned_disbursements
-- by resolving the existing text fields (*_ref, *_name) against the organizations table.
--
-- Strategy (per side, per table, in order — only fills rows where the FK is currently NULL):
--   1. Match *_ref against organizations.iati_org_id, organizations.code (case-insensitive, trimmed)
--   2. Fall back to *_name against organizations.acronym, organizations.name
--
-- Safety:
--   - Wrapped in a single transaction.
--   - Only updates rows where the FK is NULL (no overwrites).
--   - Only writes when exactly ONE organization matches (HAVING COUNT(*) = 1) so that
--     ambiguous text values (multiple orgs with the same name) are left NULL for manual triage.
--   - Idempotent: safe to re-run; subsequent runs are no-ops once everything that can be
--     resolved has been.
--
-- The DO block at the end emits row counts via RAISE NOTICE so you can read progress
-- in the Supabase SQL editor's "Results" / "Notices" panel.

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: a single CTE for organizations exposes both a normalised ref key and
-- a normalised name key. We deduplicate so that an org with the same iati_org_id
-- and code only counts once per ref.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. transactions.provider_org_id
-- ===========================================================================

-- 1a. By *_ref → organizations.iati_org_id / organizations.code
WITH ref_lookup AS (
    SELECT
        LOWER(TRIM(t.provider_org_ref)) AS key,
        t.uuid AS row_id
    FROM transactions t
    WHERE t.provider_org_id IS NULL
      AND t.provider_org_ref IS NOT NULL
      AND TRIM(t.provider_org_ref) <> ''
),
candidates AS (
    SELECT r.row_id, o.id AS org_id
    FROM ref_lookup r
    JOIN organizations o
      ON  LOWER(TRIM(o.iati_org_id)) = r.key
       OR LOWER(TRIM(o.code))        = r.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE transactions t
SET provider_org_id = m.org_id
FROM unique_matches m
WHERE t.uuid = m.row_id
  AND t.provider_org_id IS NULL;

-- 1b. By *_name → organizations.acronym / organizations.name
WITH name_lookup AS (
    SELECT
        LOWER(TRIM(t.provider_org_name)) AS key,
        t.uuid AS row_id
    FROM transactions t
    WHERE t.provider_org_id IS NULL
      AND t.provider_org_name IS NOT NULL
      AND TRIM(t.provider_org_name) <> ''
),
candidates AS (
    SELECT n.row_id, o.id AS org_id
    FROM name_lookup n
    JOIN organizations o
      ON  LOWER(TRIM(o.acronym)) = n.key
       OR LOWER(TRIM(o.name))    = n.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE transactions t
SET provider_org_id = m.org_id
FROM unique_matches m
WHERE t.uuid = m.row_id
  AND t.provider_org_id IS NULL;

-- ===========================================================================
-- 2. transactions.receiver_org_id
-- ===========================================================================

-- 2a. By *_ref
WITH ref_lookup AS (
    SELECT
        LOWER(TRIM(t.receiver_org_ref)) AS key,
        t.uuid AS row_id
    FROM transactions t
    WHERE t.receiver_org_id IS NULL
      AND t.receiver_org_ref IS NOT NULL
      AND TRIM(t.receiver_org_ref) <> ''
),
candidates AS (
    SELECT r.row_id, o.id AS org_id
    FROM ref_lookup r
    JOIN organizations o
      ON  LOWER(TRIM(o.iati_org_id)) = r.key
       OR LOWER(TRIM(o.code))        = r.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE transactions t
SET receiver_org_id = m.org_id
FROM unique_matches m
WHERE t.uuid = m.row_id
  AND t.receiver_org_id IS NULL;

-- 2b. By *_name
WITH name_lookup AS (
    SELECT
        LOWER(TRIM(t.receiver_org_name)) AS key,
        t.uuid AS row_id
    FROM transactions t
    WHERE t.receiver_org_id IS NULL
      AND t.receiver_org_name IS NOT NULL
      AND TRIM(t.receiver_org_name) <> ''
),
candidates AS (
    SELECT n.row_id, o.id AS org_id
    FROM name_lookup n
    JOIN organizations o
      ON  LOWER(TRIM(o.acronym)) = n.key
       OR LOWER(TRIM(o.name))    = n.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE transactions t
SET receiver_org_id = m.org_id
FROM unique_matches m
WHERE t.uuid = m.row_id
  AND t.receiver_org_id IS NULL;

-- ===========================================================================
-- 3. planned_disbursements.provider_org_id
-- ===========================================================================

-- 3a. By *_ref
WITH ref_lookup AS (
    SELECT
        LOWER(TRIM(pd.provider_org_ref)) AS key,
        pd.id AS row_id
    FROM planned_disbursements pd
    WHERE pd.provider_org_id IS NULL
      AND pd.provider_org_ref IS NOT NULL
      AND TRIM(pd.provider_org_ref) <> ''
),
candidates AS (
    SELECT r.row_id, o.id AS org_id
    FROM ref_lookup r
    JOIN organizations o
      ON  LOWER(TRIM(o.iati_org_id)) = r.key
       OR LOWER(TRIM(o.code))        = r.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE planned_disbursements pd
SET provider_org_id = m.org_id
FROM unique_matches m
WHERE pd.id = m.row_id
  AND pd.provider_org_id IS NULL;

-- 3b. By *_name
WITH name_lookup AS (
    SELECT
        LOWER(TRIM(pd.provider_org_name)) AS key,
        pd.id AS row_id
    FROM planned_disbursements pd
    WHERE pd.provider_org_id IS NULL
      AND pd.provider_org_name IS NOT NULL
      AND TRIM(pd.provider_org_name) <> ''
),
candidates AS (
    SELECT n.row_id, o.id AS org_id
    FROM name_lookup n
    JOIN organizations o
      ON  LOWER(TRIM(o.acronym)) = n.key
       OR LOWER(TRIM(o.name))    = n.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE planned_disbursements pd
SET provider_org_id = m.org_id
FROM unique_matches m
WHERE pd.id = m.row_id
  AND pd.provider_org_id IS NULL;

-- ===========================================================================
-- 4. planned_disbursements.receiver_org_id
-- ===========================================================================

-- 4a. By *_ref
WITH ref_lookup AS (
    SELECT
        LOWER(TRIM(pd.receiver_org_ref)) AS key,
        pd.id AS row_id
    FROM planned_disbursements pd
    WHERE pd.receiver_org_id IS NULL
      AND pd.receiver_org_ref IS NOT NULL
      AND TRIM(pd.receiver_org_ref) <> ''
),
candidates AS (
    SELECT r.row_id, o.id AS org_id
    FROM ref_lookup r
    JOIN organizations o
      ON  LOWER(TRIM(o.iati_org_id)) = r.key
       OR LOWER(TRIM(o.code))        = r.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE planned_disbursements pd
SET receiver_org_id = m.org_id
FROM unique_matches m
WHERE pd.id = m.row_id
  AND pd.receiver_org_id IS NULL;

-- 4b. By *_name
WITH name_lookup AS (
    SELECT
        LOWER(TRIM(pd.receiver_org_name)) AS key,
        pd.id AS row_id
    FROM planned_disbursements pd
    WHERE pd.receiver_org_id IS NULL
      AND pd.receiver_org_name IS NOT NULL
      AND TRIM(pd.receiver_org_name) <> ''
),
candidates AS (
    SELECT n.row_id, o.id AS org_id
    FROM name_lookup n
    JOIN organizations o
      ON  LOWER(TRIM(o.acronym)) = n.key
       OR LOWER(TRIM(o.name))    = n.key
),
unique_matches AS (
    SELECT row_id, (array_agg(org_id))[1] AS org_id
    FROM (SELECT DISTINCT row_id, org_id FROM candidates) d
    GROUP BY row_id
    HAVING COUNT(*) = 1
)
UPDATE planned_disbursements pd
SET receiver_org_id = m.org_id
FROM unique_matches m
WHERE pd.id = m.row_id
  AND pd.receiver_org_id IS NULL;

-- ===========================================================================
-- 5. Post-run summary (writes to NOTICES; no data is changed)
-- ===========================================================================
DO $$
DECLARE
    t_total          BIGINT;
    t_prov_resolved  BIGINT;
    t_recv_resolved  BIGINT;
    pd_total         BIGINT;
    pd_prov_resolved BIGINT;
    pd_recv_resolved BIGINT;
BEGIN
    SELECT COUNT(*) INTO t_total FROM transactions;
    SELECT COUNT(*) INTO t_prov_resolved FROM transactions WHERE provider_org_id IS NOT NULL;
    SELECT COUNT(*) INTO t_recv_resolved FROM transactions WHERE receiver_org_id IS NOT NULL;

    SELECT COUNT(*) INTO pd_total FROM planned_disbursements;
    SELECT COUNT(*) INTO pd_prov_resolved FROM planned_disbursements WHERE provider_org_id IS NOT NULL;
    SELECT COUNT(*) INTO pd_recv_resolved FROM planned_disbursements WHERE receiver_org_id IS NOT NULL;

    RAISE NOTICE 'transactions: % rows total | provider_org_id resolved: % | receiver_org_id resolved: %',
        t_total, t_prov_resolved, t_recv_resolved;
    RAISE NOTICE 'planned_disbursements: % rows total | provider_org_id resolved: % | receiver_org_id resolved: %',
        pd_total, pd_prov_resolved, pd_recv_resolved;
END $$;

COMMIT;

-- ===========================================================================
-- 6. Triage view: rows STILL unresolved (run AFTER commit, read-only)
--    Use this to see which text refs/names had no match, or had ambiguous
--    matches, so you can fix the organizations table or the source data.
-- ===========================================================================
-- SELECT 'transactions.provider' AS scope, provider_org_ref AS ref, provider_org_name AS name, COUNT(*) AS rows
--   FROM transactions WHERE provider_org_id IS NULL AND (provider_org_ref IS NOT NULL OR provider_org_name IS NOT NULL)
--   GROUP BY 1, 2, 3
-- UNION ALL
-- SELECT 'transactions.receiver', receiver_org_ref, receiver_org_name, COUNT(*)
--   FROM transactions WHERE receiver_org_id IS NULL AND (receiver_org_ref IS NOT NULL OR receiver_org_name IS NOT NULL)
--   GROUP BY 1, 2, 3
-- UNION ALL
-- SELECT 'planned_disbursements.provider', provider_org_ref, provider_org_name, COUNT(*)
--   FROM planned_disbursements WHERE provider_org_id IS NULL AND (provider_org_ref IS NOT NULL OR provider_org_name IS NOT NULL)
--   GROUP BY 1, 2, 3
-- UNION ALL
-- SELECT 'planned_disbursements.receiver', receiver_org_ref, receiver_org_name, COUNT(*)
--   FROM planned_disbursements WHERE receiver_org_id IS NULL AND (receiver_org_ref IS NOT NULL OR receiver_org_name IS NOT NULL)
--   GROUP BY 1, 2, 3
-- ORDER BY rows DESC
-- LIMIT 50;
