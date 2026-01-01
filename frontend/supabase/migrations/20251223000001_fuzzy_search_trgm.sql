-- Search Supercharging: Fuzzy Search with pg_trgm
-- This migration enables typo-tolerant search using PostgreSQL's trigram extension

-- =====================================================
-- ENABLE pg_trgm EXTENSION
-- =====================================================

-- Enable the trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- TRIGRAM INDEXES FOR ACTIVITIES
-- =====================================================

-- Trigram index on title for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_activities_title_trgm 
ON activities USING gin(title_narrative gin_trgm_ops);

-- Trigram index on acronym for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_activities_acronym_trgm 
ON activities USING gin(acronym gin_trgm_ops);

-- Trigram index on description for fuzzy matching (optional, can be expensive)
CREATE INDEX IF NOT EXISTS idx_activities_description_trgm 
ON activities USING gin(description_narrative gin_trgm_ops);

-- =====================================================
-- TRIGRAM INDEXES FOR ORGANIZATIONS
-- =====================================================

-- Trigram index on name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_organizations_name_trgm 
ON organizations USING gin(name gin_trgm_ops);

-- Trigram index on acronym for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_organizations_acronym_trgm 
ON organizations USING gin(acronym gin_trgm_ops);

-- =====================================================
-- TRIGRAM INDEXES FOR USERS
-- =====================================================

-- Trigram index on first_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_users_first_name_trgm 
ON users USING gin(first_name gin_trgm_ops);

-- Trigram index on last_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_users_last_name_trgm 
ON users USING gin(last_name gin_trgm_ops);

-- =====================================================
-- TRIGRAM INDEXES FOR ACTIVITY_CONTACTS
-- =====================================================

-- Trigram index on first_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_activity_contacts_first_name_trgm 
ON activity_contacts USING gin(first_name gin_trgm_ops);

-- Trigram index on last_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_activity_contacts_last_name_trgm 
ON activity_contacts USING gin(last_name gin_trgm_ops);

-- Trigram index on organisation for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_activity_contacts_organisation_trgm 
ON activity_contacts USING gin(organisation gin_trgm_ops);

-- =====================================================
-- TRIGRAM INDEXES FOR TAGS
-- =====================================================

-- Trigram index on name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm 
ON tags USING gin(name gin_trgm_ops);

-- =====================================================
-- TRIGRAM INDEXES FOR ACTIVITY_SECTORS
-- =====================================================

-- Trigram index on sector_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_activity_sectors_name_trgm 
ON activity_sectors USING gin(sector_name gin_trgm_ops);

-- =====================================================
-- SET SIMILARITY THRESHOLD
-- =====================================================

-- Set a reasonable similarity threshold for fuzzy matching
-- This can be adjusted based on desired strictness (0.3 is default, lower = more fuzzy)
-- Note: This is a session-level setting, will be set in the RPC function
-- ALTER DATABASE aims SET pg_trgm.similarity_threshold = 0.3;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON EXTENSION pg_trgm IS 'Trigram extension for fuzzy text matching and typo tolerance';




