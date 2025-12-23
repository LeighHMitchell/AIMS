-- Search Supercharging: Full-Text Search Vectors Migration
-- This migration adds stored tsvector columns to all searchable tables
-- with automatic update triggers for optimal search performance

-- =====================================================
-- ACTIVITIES TABLE: Search Vector Column and Trigger
-- =====================================================

-- Add search_vector column to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create trigger function for activities search vector
CREATE OR REPLACE FUNCTION activities_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title_narrative, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.acronym, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.other_identifier, '')), 'B') ||
                       setweight(to_tsvector('english', COALESCE(NEW.iati_identifier, '')), 'B') ||
                       setweight(to_tsvector('english', COALESCE(NEW.description_narrative, '')), 'C') ||
                       setweight(to_tsvector('english', COALESCE(NEW.created_by_org_name, '')), 'D') ||
                       setweight(to_tsvector('english', COALESCE(NEW.created_by_org_acronym, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activities
DROP TRIGGER IF EXISTS activities_search_vector_trigger ON activities;
CREATE TRIGGER activities_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title_narrative, acronym, other_identifier, iati_identifier, 
                             description_narrative, created_by_org_name, created_by_org_acronym
  ON activities
  FOR EACH ROW EXECUTE FUNCTION activities_search_vector_update();

-- Populate existing activities search vectors
UPDATE activities SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title_narrative, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(acronym, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(other_identifier, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(iati_identifier, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description_narrative, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(created_by_org_name, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(created_by_org_acronym, '')), 'D')
WHERE search_vector IS NULL;

-- Create GIN index on activities search_vector
CREATE INDEX IF NOT EXISTS idx_activities_search_vector 
ON activities USING gin(search_vector);

-- =====================================================
-- ORGANIZATIONS TABLE: Search Vector Column and Trigger
-- =====================================================

-- Add search_vector column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create trigger function for organizations search vector
CREATE OR REPLACE FUNCTION organizations_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.acronym, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.iati_org_id, '')), 'B') ||
                       setweight(to_tsvector('english', COALESCE(NEW.type, '')), 'C') ||
                       setweight(to_tsvector('english', COALESCE(NEW.country, '')), 'C') ||
                       setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for organizations
DROP TRIGGER IF EXISTS organizations_search_vector_trigger ON organizations;
CREATE TRIGGER organizations_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, acronym, iati_org_id, type, country, description
  ON organizations
  FOR EACH ROW EXECUTE FUNCTION organizations_search_vector_update();

-- Populate existing organizations search vectors
UPDATE organizations SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(acronym, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(iati_org_id, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(type, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(country, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'D')
WHERE search_vector IS NULL;

-- Create GIN index on organizations search_vector
CREATE INDEX IF NOT EXISTS idx_organizations_search_vector 
ON organizations USING gin(search_vector);

-- =====================================================
-- USERS TABLE: Search Vector Column and Trigger
-- =====================================================

-- Add search_vector column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create trigger function for users search vector
CREATE OR REPLACE FUNCTION users_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users
DROP TRIGGER IF EXISTS users_search_vector_trigger ON users;
CREATE TRIGGER users_search_vector_trigger
  BEFORE INSERT OR UPDATE OF first_name, last_name, email
  ON users
  FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();

-- Populate existing users search vectors
UPDATE users SET search_vector = 
  setweight(to_tsvector('english', COALESCE(first_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(last_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B')
WHERE search_vector IS NULL;

-- Create GIN index on users search_vector
CREATE INDEX IF NOT EXISTS idx_users_search_vector 
ON users USING gin(search_vector);

-- =====================================================
-- ACTIVITY_CONTACTS TABLE: Search Vector Column and Trigger
-- =====================================================

-- Add search_vector column to activity_contacts
ALTER TABLE activity_contacts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create trigger function for activity_contacts search vector
CREATE OR REPLACE FUNCTION activity_contacts_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.middle_name, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.position, '')), 'B') ||
                       setweight(to_tsvector('english', COALESCE(NEW.organisation, '')), 'B') ||
                       setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activity_contacts
DROP TRIGGER IF EXISTS activity_contacts_search_vector_trigger ON activity_contacts;
CREATE TRIGGER activity_contacts_search_vector_trigger
  BEFORE INSERT OR UPDATE OF first_name, middle_name, last_name, position, organisation, email
  ON activity_contacts
  FOR EACH ROW EXECUTE FUNCTION activity_contacts_search_vector_update();

-- Populate existing activity_contacts search vectors
UPDATE activity_contacts SET search_vector = 
  setweight(to_tsvector('english', COALESCE(first_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(middle_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(last_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(position, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(organisation, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'C')
WHERE search_vector IS NULL;

-- Create GIN index on activity_contacts search_vector
CREATE INDEX IF NOT EXISTS idx_activity_contacts_search_vector 
ON activity_contacts USING gin(search_vector);

-- =====================================================
-- TAGS TABLE: Search Vector Column and Trigger
-- =====================================================

-- Add search_vector column to tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create trigger function for tags search vector
CREATE OR REPLACE FUNCTION tags_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                       setweight(to_tsvector('english', COALESCE(NEW.code, '')), 'B') ||
                       setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tags
DROP TRIGGER IF EXISTS tags_search_vector_trigger ON tags;
CREATE TRIGGER tags_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, code, description
  ON tags
  FOR EACH ROW EXECUTE FUNCTION tags_search_vector_update();

-- Populate existing tags search vectors
UPDATE tags SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(code, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C')
WHERE search_vector IS NULL;

-- Create GIN index on tags search_vector
CREATE INDEX IF NOT EXISTS idx_tags_search_vector 
ON tags USING gin(search_vector);

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN activities.search_vector IS 'Full-text search vector for fast searching. Auto-updated by trigger.';
COMMENT ON COLUMN organizations.search_vector IS 'Full-text search vector for fast searching. Auto-updated by trigger.';
COMMENT ON COLUMN users.search_vector IS 'Full-text search vector for fast searching. Auto-updated by trigger.';
COMMENT ON COLUMN activity_contacts.search_vector IS 'Full-text search vector for fast searching. Auto-updated by trigger.';
COMMENT ON COLUMN tags.search_vector IS 'Full-text search vector for fast searching. Auto-updated by trigger.';

