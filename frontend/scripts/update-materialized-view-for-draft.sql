-- Update materialized view to include ALL transactions (not just 'actual' status)
-- This will show transactions with status 'draft' as well

DROP MATERIALIZED VIEW IF EXISTS activity_transaction_summaries;

CREATE MATERIALIZED VIEW activity_transaction_summaries AS
SELECT 
    a.id as activity_id,
    COUNT(t.uuid) as total_transactions,
    -- Include ALL transactions, not just 'actual' ones
    COALESCE(SUM(CASE WHEN t.transaction_type = '2' THEN t.value ELSE 0 END), 0) as commitments,
    COALESCE(SUM(CASE WHEN t.transaction_type = '3' THEN t.value ELSE 0 END), 0) as disbursements,
    COALESCE(SUM(CASE WHEN t.transaction_type = '4' THEN t.value ELSE 0 END), 0) as expenditures,
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('1', '11') THEN t.value ELSE 0 END), 0) as inflows
FROM activities a
LEFT JOIN transactions t ON a.id = t.activity_id
GROUP BY a.id;

-- Recreate the index
CREATE UNIQUE INDEX idx_activity_transaction_summaries_activity_id 
ON activity_transaction_summaries(activity_id);

-- Refresh permissions
GRANT SELECT ON activity_transaction_summaries TO authenticated;