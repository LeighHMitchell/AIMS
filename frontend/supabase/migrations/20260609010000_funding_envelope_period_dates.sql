-- IATI org-level budgets require an explicit period-start and period-end date
-- (both mandatory, period <= 1 year). Capture them directly instead of a year.
--
-- year_start / year_end are retained and kept in sync (derived from the dates)
-- so existing analytics and temporal-category logic continue to work.
-- Idempotent: safe to re-run.

ALTER TABLE organization_funding_envelopes
  ADD COLUMN IF NOT EXISTS period_start DATE;

ALTER TABLE organization_funding_envelopes
  ADD COLUMN IF NOT EXISTS period_end DATE;

-- Backfill existing rows from their year(s): calendar-year span as a sensible
-- default for data captured before explicit dates existed.
UPDATE organization_funding_envelopes
   SET period_start = make_date(year_start, 1, 1),
       period_end   = make_date(COALESCE(year_end, year_start), 12, 31)
 WHERE period_start IS NULL;

COMMENT ON COLUMN organization_funding_envelopes.period_start IS 'IATI period-start/@iso-date for the budget period';
COMMENT ON COLUMN organization_funding_envelopes.period_end IS 'IATI period-end/@iso-date for the budget period (period must be <= 1 year)';
