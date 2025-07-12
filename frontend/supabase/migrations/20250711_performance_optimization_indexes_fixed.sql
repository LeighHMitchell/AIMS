-- Performance Optimization Indexes for AIMS (FIXED VERSION)
-- Created: 2025-07-11
-- Purpose: Add missing indexes to improve query performance for Activity List, Transaction List, and Activity Editor

-- ===========================================
-- ACTIVITIES TABLE INDEXES
-- ===========================================

-- Index for filtering by publication_status (used in Activity List)
CREATE INDEX IF NOT EXISTS idx_activities_publication_status 
ON activities(publication_status) 
WHERE publication_status IS NOT NULL;

-- Index for filtering by activity_status (used in Activity List)
CREATE INDEX IF NOT EXISTS idx_activities_activity_status 
ON activities(activity_status) 
WHERE activity_status IS NOT NULL;

-- Index for filtering by submission_status (used in Activity List)
CREATE INDEX IF NOT EXISTS idx_activities_submission_status 
ON activities(submission_status) 
WHERE submission_status IS NOT NULL;

-- Composite index for common sorting patterns (Activity List)
CREATE INDEX IF NOT EXISTS idx_activities_sorting 
ON activities(updated_at DESC, created_at DESC);

-- Index for reporting_org_id foreign key (used in joins)
CREATE INDEX IF NOT EXISTS idx_activities_reporting_org_id 
ON activities(reporting_org_id) 
WHERE reporting_org_id IS NOT NULL;

-- Full text search index for title and description
CREATE INDEX IF NOT EXISTS idx_activities_title_gin 
ON activities USING gin(to_tsvector('english', title_narrative));

-- Index for IATI identifier search
CREATE INDEX IF NOT EXISTS idx_activities_iati_identifier 
ON activities(iati_identifier) 
WHERE iati_identifier IS NOT NULL;

-- Index for other_identifier (partner ID) search
CREATE INDEX IF NOT EXISTS idx_activities_other_identifier 
ON activities(other_identifier) 
WHERE other_identifier IS NOT NULL;

-- ===========================================
-- TRANSACTIONS TABLE INDEXES
-- ===========================================

-- Composite index for activity-based transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_activity_date 
ON transactions(activity_id, transaction_date DESC);

-- Index for transaction type filtering
CREATE INDEX IF NOT EXISTS idx_transactions_type 
ON transactions(transaction_type) 
WHERE transaction_type IS NOT NULL;

-- Index for transaction status filtering
CREATE INDEX IF NOT EXISTS idx_transactions_status 
ON transactions(status) 
WHERE status IS NOT NULL;

-- Indexes for provider/receiver org joins (FIXED - using correct column names)
CREATE INDEX IF NOT EXISTS idx_transactions_provider_org_id 
ON transactions(provider_org_id) 
WHERE provider_org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_receiver_org_id 
ON transactions(receiver_org_id) 
WHERE receiver_org_id IS NOT NULL;

-- Index for value-based queries (financial summaries)
CREATE INDEX IF NOT EXISTS idx_transactions_value 
ON transactions(value) 
WHERE value > 0;

-- ===========================================
-- ACTIVITY_SECTORS TABLE INDEXES
-- ===========================================

-- Composite index for activity-based sector queries
CREATE INDEX IF NOT EXISTS idx_activity_sectors_activity_id 
ON activity_sectors(activity_id);

-- Index for sector code lookups
CREATE INDEX IF NOT EXISTS idx_activity_sectors_code 
ON activity_sectors(sector_code) 
WHERE sector_code IS NOT NULL;

-- ===========================================
-- ORGANIZATIONS TABLE INDEXES
-- ===========================================

-- Index for organization name search
CREATE INDEX IF NOT EXISTS idx_organizations_name_gin 
ON organizations USING gin(to_tsvector('english', name));

-- Index for acronym search
CREATE INDEX IF NOT EXISTS idx_organizations_acronym 
ON organizations(acronym) 
WHERE acronym IS NOT NULL;

-- Index for organization type filtering
CREATE INDEX IF NOT EXISTS idx_organizations_type 
ON organizations(type) 
WHERE type IS NOT NULL;

-- ===========================================
-- ACTIVITY_CONTRIBUTORS TABLE INDEXES
-- ===========================================

-- Composite index for activity-based contributor queries
CREATE INDEX IF NOT EXISTS idx_activity_contributors_activity_org 
ON activity_contributors(activity_id, organization_id);

-- Index for contributor status filtering
CREATE INDEX IF NOT EXISTS idx_activity_contributors_status 
ON activity_contributors(status) 
WHERE status IS NOT NULL;

-- ===========================================
-- PERFORMANCE ANALYSIS VIEWS
-- ===========================================

-- Create a materialized view for activity summaries to speed up the Activity List
-- This pre-calculates transaction summaries
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

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_activity_transaction_summaries()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY activity_transaction_summaries;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- QUERY OPTIMIZATION STATISTICS
-- ===========================================

-- Update table statistics for better query planning
ANALYZE activities;
ANALYZE transactions;
ANALYZE activity_sectors;
ANALYZE organizations;
ANALYZE activity_contributors;

-- ===========================================
-- PERFORMANCE MONITORING
-- ===========================================

-- Create a simple query performance log table
CREATE TABLE IF NOT EXISTS query_performance_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    query_type varchar(50) NOT NULL,
    execution_time_ms integer NOT NULL,
    result_count integer,
    filters jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_query_performance_log_created 
ON query_performance_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_performance_log_type 
ON query_performance_log(query_type);

-- ===========================================
-- CLEANUP AND MAINTENANCE
-- ===========================================

-- Grant necessary permissions
GRANT SELECT ON activity_transaction_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_activity_transaction_summaries() TO authenticated;

-- ===========================================
-- REFRESH THE MATERIALIZED VIEW
-- ===========================================
-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW activity_transaction_summaries;

-- ===========================================
-- PERFORMANCE NOTES
-- ===========================================
-- 1. These indexes should significantly improve:
--    - Activity List load time (especially with filters)
--    - Transaction queries per activity
--    - Search performance
--    - Join performance between tables
--
-- 2. The materialized view pre-calculates transaction summaries
--    reducing the need for complex aggregations on every request
--
-- 3. Consider refreshing the materialized view:
--    - Every 15 minutes via cron job
--    - After bulk transaction imports
--    - Via a trigger on transaction inserts/updates
--
-- 4. Monitor the query_performance_log table to identify
--    any remaining slow queries