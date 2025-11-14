-- Add USD conversion fields to activity_budgets table
-- This enables currency conversion for budgets in the Activity Budgets tab

ALTER TABLE activity_budgets
ADD COLUMN IF NOT EXISTS usd_value DECIMAL(15,2);

COMMENT ON COLUMN activity_budgets.usd_value IS 'USD equivalent of the budget value, calculated using exchange rates at value_date';

-- Add USD conversion fields to planned_disbursements table
-- This enables currency conversion for planned disbursements in the Planned Disbursements tab

ALTER TABLE planned_disbursements
ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(15,2);

COMMENT ON COLUMN planned_disbursements.usd_amount IS 'USD equivalent of the disbursement amount, calculated using exchange rates at value_date or period_start';
