-- Performance: server-side aggregation for the organizations list page.
--
-- Replaces the previous approach in /api/organizations-list which fetched
-- EVERY activity, budget, transaction and planned disbursement for the page's
-- orgs and aggregated them in Node with O(n^2) Array.includes() loops. That
-- scaled with the size of the whole transactions/budgets tables rather than
-- with the page. This function does the same aggregation in a single round
-- trip, in SQL, using the indexes added in the companion migration.
--
-- Semantics are intentionally identical to the old JS:
--   activity_count  : activities reported by the org
--   total_budgeted  : sum of usd_value (fallback value when currency='USD')
--                     across budgets of the org's reported activities
--   total_disbursed : sum of value_usd of type '3' (disbursement) transactions
--                     where the org is provider OR receiver (counted once per role,
--                     matching the old per-role accumulation)
--   provider_count  : transactions + planned disbursements where org is provider
--   receiver_count  : transactions + planned disbursements where org is receiver

CREATE OR REPLACE FUNCTION get_organization_stats(p_org_ids uuid[])
RETURNS TABLE (
  org_id uuid,
  activity_count bigint,
  total_budgeted numeric,
  total_disbursed numeric,
  provider_count bigint,
  receiver_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH orgs AS (
    SELECT unnest(p_org_ids) AS id
  ),
  act AS (
    SELECT a.reporting_org_id AS org_id, count(*) AS cnt
    FROM activities a
    WHERE a.reporting_org_id = ANY (p_org_ids)
    GROUP BY a.reporting_org_id
  ),
  bud AS (
    SELECT a.reporting_org_id AS org_id,
           sum(coalesce(b.usd_value,
                        CASE WHEN b.currency = 'USD' THEN b.value ELSE 0 END,
                        0)) AS total
    FROM activity_budgets b
    JOIN activities a ON a.id = b.activity_id
    WHERE a.reporting_org_id = ANY (p_org_ids)
    GROUP BY a.reporting_org_id
  ),
  disb AS (
    SELECT s.org_id, sum(s.value_usd) AS total
    FROM (
      SELECT provider_org_id AS org_id, value_usd
      FROM transactions
      WHERE transaction_type = '3' AND provider_org_id = ANY (p_org_ids)
      UNION ALL
      SELECT receiver_org_id AS org_id, value_usd
      FROM transactions
      WHERE transaction_type = '3' AND receiver_org_id = ANY (p_org_ids)
    ) s
    GROUP BY s.org_id
  ),
  tx_prov AS (
    SELECT provider_org_id AS org_id, count(*) AS cnt
    FROM transactions
    WHERE provider_org_id = ANY (p_org_ids)
    GROUP BY provider_org_id
  ),
  tx_recv AS (
    SELECT receiver_org_id AS org_id, count(*) AS cnt
    FROM transactions
    WHERE receiver_org_id = ANY (p_org_ids)
    GROUP BY receiver_org_id
  ),
  pd_prov AS (
    SELECT provider_org_id AS org_id, count(*) AS cnt
    FROM planned_disbursements
    WHERE provider_org_id = ANY (p_org_ids)
    GROUP BY provider_org_id
  ),
  pd_recv AS (
    SELECT receiver_org_id AS org_id, count(*) AS cnt
    FROM planned_disbursements
    WHERE receiver_org_id = ANY (p_org_ids)
    GROUP BY receiver_org_id
  )
  SELECT
    o.id AS org_id,
    coalesce(act.cnt, 0)                                   AS activity_count,
    coalesce(bud.total, 0)                                 AS total_budgeted,
    coalesce(disb.total, 0)                                AS total_disbursed,
    coalesce(tx_prov.cnt, 0) + coalesce(pd_prov.cnt, 0)    AS provider_count,
    coalesce(tx_recv.cnt, 0) + coalesce(pd_recv.cnt, 0)    AS receiver_count
  FROM orgs o
  LEFT JOIN act     ON act.org_id     = o.id
  LEFT JOIN bud     ON bud.org_id     = o.id
  LEFT JOIN disb    ON disb.org_id    = o.id
  LEFT JOIN tx_prov ON tx_prov.org_id = o.id
  LEFT JOIN tx_recv ON tx_recv.org_id = o.id
  LEFT JOIN pd_prov ON pd_prov.org_id = o.id
  LEFT JOIN pd_recv ON pd_recv.org_id = o.id;
$$;

GRANT EXECUTE ON FUNCTION get_organization_stats(uuid[]) TO authenticated, anon, service_role;
