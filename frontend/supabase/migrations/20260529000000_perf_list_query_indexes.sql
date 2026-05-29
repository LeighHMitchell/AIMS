-- Performance: indexes for the main left-sidebar list pages
-- (activities, organizations, transactions, planned disbursements, budgets).
--
-- These back the org-filter joins, per-org aggregation, list sorting and
-- the new get_organization_stats() RPC. All use IF NOT EXISTS so the
-- migration is safe to re-run and a no-op where an equivalent index exists.

-- Activities: org filter / join + list sort
CREATE INDEX IF NOT EXISTS idx_activities_reporting_org_id
  ON activities (reporting_org_id);
CREATE INDEX IF NOT EXISTS idx_activities_updated_at
  ON activities (updated_at DESC);

-- Activity budgets: join to activities + list sort
CREATE INDEX IF NOT EXISTS idx_activity_budgets_activity_id
  ON activity_budgets (activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_budgets_period_start
  ON activity_budgets (period_start);

-- Transactions: activity join, provider/receiver lookups, list filter/sort
CREATE INDEX IF NOT EXISTS idx_transactions_activity_id
  ON transactions (activity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_org_id
  ON transactions (provider_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_org_id
  ON transactions (receiver_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date
  ON transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type
  ON transactions (transaction_type);
-- Partial index speeds up the disbursement (type 3) aggregation in get_organization_stats()
CREATE INDEX IF NOT EXISTS idx_transactions_type3_provider
  ON transactions (provider_org_id) WHERE transaction_type = '3';
CREATE INDEX IF NOT EXISTS idx_transactions_type3_receiver
  ON transactions (receiver_org_id) WHERE transaction_type = '3';

-- Planned disbursements: activity join, provider/receiver lookups, list sort
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_activity_id
  ON planned_disbursements (activity_id);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_provider_org_id
  ON planned_disbursements (provider_org_id);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_receiver_org_id
  ON planned_disbursements (receiver_org_id);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_period_start
  ON planned_disbursements (period_start);
