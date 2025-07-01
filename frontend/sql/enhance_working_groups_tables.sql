-- Enhanced working_groups table with additional fields
ALTER TABLE working_groups 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS lead_person_id UUID,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Create working_group_memberships table
CREATE TABLE IF NOT EXISTS working_group_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,  -- References Rolodex entries
  person_name VARCHAR(255) NOT NULL,
  person_email VARCHAR(255),
  person_organization VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('chair', 'secretary', 'member', 'observer')),
  is_active BOOLEAN DEFAULT true,
  joined_on DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(working_group_id, person_id)
);

-- Create working_group_documents table
CREATE TABLE IF NOT EXISTS working_group_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  document_type VARCHAR(50), -- 'tor', 'minutes', 'report', 'other'
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_working_group_memberships_group ON working_group_memberships(working_group_id);
CREATE INDEX IF NOT EXISTS idx_working_group_memberships_person ON working_group_memberships(person_id);
CREATE INDEX IF NOT EXISTS idx_working_groups_slug ON working_groups(slug);

-- Update existing working groups with slugs
UPDATE working_groups 
SET slug = LOWER(REPLACE(REPLACE(code, 'TWG-', ''), 'SWG-', ''))
WHERE slug IS NULL;

-- Add member count function
CREATE OR REPLACE FUNCTION get_working_group_member_count(group_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM working_group_memberships
    WHERE working_group_id = group_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Add activities count function
CREATE OR REPLACE FUNCTION get_working_group_activities_count(group_code VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT awg.activity_id)
    FROM activity_working_groups awg
    JOIN working_groups wg ON wg.id = awg.working_group_id
    WHERE wg.code = group_code
  );
END;
$$ LANGUAGE plpgsql; 