-- Performance Optimization Indexes
-- Created: 2026-01-15
-- Purpose: Add missing indexes for common query patterns identified in performance analysis

-- ============================================================================
-- TRANSACTIONS TABLE INDEXES (HIGH PRIORITY)
-- These columns are frequently filtered but were missing indexes
-- ============================================================================

-- Transaction type filter (used in almost every transactions query)
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type
  ON transactions(transaction_type)
  WHERE transaction_type IS NOT NULL;

-- Transaction date for range queries and sorting (DESC for reverse chronological)
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date
  ON transactions(transaction_date DESC)
  WHERE transaction_date IS NOT NULL;

-- Finance type filter
CREATE INDEX IF NOT EXISTS idx_transactions_finance_type
  ON transactions(finance_type)
  WHERE finance_type IS NOT NULL;

-- Flow type filter
CREATE INDEX IF NOT EXISTS idx_transactions_flow_type
  ON transactions(flow_type)
  WHERE flow_type IS NOT NULL;

-- ============================================================================
-- ACTIVITIES TABLE INDEXES (HIGH PRIORITY)
-- These columns are used in multi-value filters
-- ============================================================================

-- Default aid type filter (used in activities-optimized API)
CREATE INDEX IF NOT EXISTS idx_activities_default_aid_type
  ON activities(default_aid_type)
  WHERE default_aid_type IS NOT NULL;

-- Default tied status filter (used in activities-optimized API)
CREATE INDEX IF NOT EXISTS idx_activities_default_tied_status
  ON activities(default_tied_status)
  WHERE default_tied_status IS NOT NULL;

-- ============================================================================
-- COMPOSITE INDEXES (MEDIUM PRIORITY)
-- For common query pattern combinations
-- ============================================================================

-- Transactions filtered by activity and status (common in activity detail views)
CREATE INDEX IF NOT EXISTS idx_transactions_activity_status
  ON transactions(activity_id, status)
  WHERE activity_id IS NOT NULL;

-- Activities filtered by status and sorted by updated_at (common list query pattern)
CREATE INDEX IF NOT EXISTS idx_activities_status_updated
  ON activities(activity_status, updated_at DESC)
  WHERE activity_status IS NOT NULL;

-- Organizations with activity counts - for aggregation queries
CREATE INDEX IF NOT EXISTS idx_activities_reporting_org_status
  ON activities(reporting_org_id, activity_status)
  WHERE reporting_org_id IS NOT NULL;

-- ============================================================================
-- COMMENT: Expected Performance Improvements
-- ============================================================================
-- These indexes target the most common query patterns identified in:
-- - /api/activities-optimized (filters on aid_type, tied_status)
-- - /api/transactions (filters on transaction_type, finance_type, flow_type, date)
-- - /api/organizations-list (aggregation by reporting_org_id)
--
-- Expected improvement: 15-40% faster filtered/sorted queries
-- ============================================================================
