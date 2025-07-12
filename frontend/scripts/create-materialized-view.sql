-- Quick fix: Create the materialized view for activity transaction summaries
-- Run this in your Supabase SQL editor

CREATE MATERIALIZED VIEW IF NOT EXISTS activity_transaction_summaries AS
SELECT 
    a.id as activity_id,
    COUNT(t.uuid) as total_transactions,
    COALESCE(SUM(CASE WHEN t.transaction_type = '2' AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as commitments,
    COALESCE(SUM(CASE WHEN t.transaction_type = '3' AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as disbursements,
    COALESCE(SUM(CASE WHEN t.transaction_type = '4' AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as expenditures,
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('1', '11') AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as inflows
FROM activities a
LEFT JOIN transactions t ON a.id = t.activity_id
GROUP BY a.id;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_transaction_summaries_activity_id 
ON activity_transaction_summaries(activity_id);

-- Grant permissions
GRANT SELECT ON activity_transaction_summaries TO authenticated;

-- Refresh the view with current data
REFRESH MATERIALIZED VIEW activity_transaction_summaries;