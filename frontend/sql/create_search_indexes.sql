-- Search Supercharging: Full-Text Search Indexes Migration
-- This file creates optimized indexes for full-text search across all searchable tables
-- Run this in your Supabase SQL Editor

-- =====================================================
-- FULL-TEXT SEARCH INDEXES FOR ACTIVITIES TABLE
-- =====================================================

-- Create a combined text search vector for activities
-- This includes title, description, acronym, identifiers, and other searchable fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_search
ON activities USING gin(to_tsvector('english',
  coalesce(title_narrative, '') || ' ' ||
  coalesce(description_narrative, '') || ' ' ||
  coalesce(acronym, '') || ' ' ||
  coalesce(other_identifier, '') || ' ' ||
  coalesce(iati_identifier, '') || ' ' ||
  coalesce(sector_names, '') || ' ' ||
  coalesce(location_names, '') || ' ' ||
  coalesce(created_by_org_name, '') || ' ' ||
  coalesce(created_by_org_acronym, '')
));

-- Create a partial index for active activities only (most commonly searched)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_active_search
ON activities USING gin(to_tsvector('english',
  coalesce(title_narrative, '') || ' ' ||
  coalesce(description_narrative, '') || ' ' ||
  coalesce(acronym, '') || ' ' ||
  coalesce(other_identifier, '') || ' ' ||
  coalesce(iati_identifier, '')
))
WHERE activity_status IN ('active', '2', '1', 'implementation');

-- =====================================================
-- FULL-TEXT SEARCH INDEXES FOR ORGANIZATIONS TABLE
-- =====================================================

-- Combined text search vector for organizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_search
ON organizations USING gin(to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(acronym, '') || ' ' ||
  coalesce(iati_org_id, '') || ' ' ||
  coalesce(type, '') || ' ' ||
  coalesce(country, '') || ' ' ||
  coalesce(description, '')
));

-- =====================================================
-- FULL-TEXT SEARCH INDEXES FOR SECTORS TABLE
-- =====================================================

-- Index for sector names and codes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sectors_search
ON sectors USING gin(to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(code, '') || ' ' ||
  coalesce(category, '') || ' ' ||
  coalesce(description, '')
));

-- =====================================================
-- FULL-TEXT SEARCH INDEXES FOR TAGS TABLE
-- =====================================================

-- Index for tag names and codes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_search
ON tags USING gin(to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(code, '') || ' ' ||
  coalesce(description, '')
));

-- =====================================================
-- FULL-TEXT SEARCH INDEXES FOR ACTIVITY CONTACTS
-- =====================================================

-- Index for contact names and information
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_contacts_search
ON activity_contacts USING gin(to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(first_name, '') || ' ' ||
  coalesce(middle_name, '') || ' ' ||
  coalesce(last_name, '') || ' ' ||
  coalesce(position, '') || ' ' ||
  coalesce(organisation, '') || ' ' ||
  coalesce(email, '')
));

-- =====================================================
-- FULL-TEXT SEARCH INDEXES FOR USERS TABLE
-- =====================================================

-- Index for user names and email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search
ON users USING gin(to_tsvector('english',
  coalesce(first_name, '') || ' ' ||
  coalesce(last_name, '') || ' ' ||
  coalesce(email, '')
));

-- =====================================================
-- ADDITIONAL OPTIMIZATION INDEXES
-- =====================================================

-- Index for activity status filtering (commonly used with search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_status_updated
ON activities(activity_status, updated_at DESC);

-- Index for organization type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_type_country
ON organizations(type, country, name);

-- Composite index for recent activities search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_recent_search
ON activities(updated_at DESC, activity_status)
WHERE updated_at > NOW() - INTERVAL '6 months';

-- =====================================================
-- SEARCH PERFORMANCE MONITORING
-- =====================================================

-- Create a view to monitor index usage
CREATE OR REPLACE VIEW search_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('activities', 'organizations', 'sectors', 'tags', 'activity_contacts', 'users')
  AND indexname LIKE '%search%'
ORDER BY tablename, indexname;

-- Create a view for search performance statistics
CREATE OR REPLACE VIEW search_performance_stats AS
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables
WHERE tablename IN ('activities', 'organizations', 'sectors', 'tags', 'activity_contacts', 'users');

-- =====================================================
-- SEARCH ANALYTICS TABLE
-- =====================================================

-- Create table to track search queries and performance
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'global',
  result_count INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(search_query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_type ON search_analytics(search_type);

-- Add comment for documentation
COMMENT ON TABLE search_analytics IS 'Track search queries for analytics and performance monitoring';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant appropriate permissions for the new table
GRANT SELECT, INSERT ON search_analytics TO authenticated;
GRANT SELECT ON search_analytics TO anon;

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

-- Test the indexes with sample queries
/*
-- Test activity search
SELECT id, title_narrative, activity_status, ts_rank_cd(search_vector, query) as rank
FROM (
  SELECT id, title_narrative, activity_status,
         to_tsvector('english', coalesce(title_narrative, '') || ' ' || coalesce(description_narrative, '')) as search_vector,
         to_tsquery('english', 'climate') as query
  FROM activities
  WHERE to_tsvector('english', coalesce(title_narrative, '') || ' ' || coalesce(description_narrative, '')) @@ to_tsquery('english', 'climate')
) ranked_results
ORDER BY rank DESC
LIMIT 10;

-- Test organization search
SELECT id, name, type, country,
       ts_rank_cd(search_vector, query) as rank
FROM (
  SELECT id, name, type, country,
         to_tsvector('english', coalesce(name, '') || ' ' || coalesce(acronym, '')) as search_vector,
         to_tsquery('english', 'UNDP') as query
  FROM organizations
  WHERE to_tsvector('english', coalesce(name, '') || ' ' || coalesce(acronym, '')) @@ to_tsquery('english', 'UNDP')
) ranked_results
ORDER BY rank DESC
LIMIT 10;
*/
