-- WARNING: This will DELETE all budget data and tables!
-- Only run this if you want to completely remove the budget tables and start over

-- Drop triggers first
DROP TRIGGER IF EXISTS prevent_budget_overlap ON activity_budgets;
DROP TRIGGER IF EXISTS update_activity_budgets_updated_at ON activity_budgets;
DROP TRIGGER IF EXISTS update_activity_budget_exceptions_updated_at ON activity_budget_exceptions;

-- Drop functions
DROP FUNCTION IF EXISTS check_budget_period_overlap();

-- Drop view
DROP VIEW IF EXISTS activity_budget_totals;

-- Drop tables (this will also drop all indexes, constraints, and policies)
DROP TABLE IF EXISTS activity_budget_exceptions CASCADE;
DROP TABLE IF EXISTS activity_budgets CASCADE;

-- Confirm cleanup
SELECT 'Cleanup complete!' as status;
SELECT 'Run the original migration script to recreate the tables.' as next_step; 