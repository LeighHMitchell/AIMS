-- Check status of budget tables migration

-- Check tables
SELECT 'Tables' as category, COUNT(*) as count FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('activity_budgets', 'activity_budget_exceptions')
UNION ALL
-- Check indexes  
SELECT 'Indexes' as category, COUNT(*) as count FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN ('idx_activity_budgets_activity_id', 'idx_activity_budgets_period', 'idx_activity_budget_exceptions_activity_id')
UNION ALL
-- Check policies
SELECT 'Policies' as category, COUNT(*) as count FROM pg_policies 
WHERE tablename IN ('activity_budgets', 'activity_budget_exceptions');

-- List existing objects
SELECT '--- Existing Tables ---' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'activity_budget%';

SELECT '--- Existing Indexes ---' as info;
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'activity_budget%';

SELECT '--- Existing Policies ---' as info;
SELECT policyname, tablename FROM pg_policies WHERE tablename LIKE 'activity_budget%'; 