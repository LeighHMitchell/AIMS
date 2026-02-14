-- Working Groups Enhancement Migration v2
-- Self-contained: creates prerequisite tables if missing, then enhances

-- ============================================================
-- STEP 0: Ensure prerequisite tables/columns exist
-- (from enhance_working_groups_tables.sql)
-- ============================================================

ALTER TABLE working_groups
ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS lead_person_id UUID,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Create working_group_memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS working_group_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  person_id UUID DEFAULT gen_random_uuid(),
  person_name VARCHAR(255) NOT NULL,
  person_email VARCHAR(255),
  person_organization VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  joined_on DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create working_group_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS working_group_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT,
  document_type VARCHAR(50),
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_working_group_memberships_group ON working_group_memberships(working_group_id);
CREATE INDEX IF NOT EXISTS idx_working_groups_slug ON working_groups(slug);

-- ============================================================
-- STEP 1: Update memberships role constraint for more roles
-- ============================================================

ALTER TABLE working_group_memberships DROP CONSTRAINT IF EXISTS working_group_memberships_role_check;
ALTER TABLE working_group_memberships ADD CONSTRAINT working_group_memberships_role_check
  CHECK (role IN ('chair', 'co_chair', 'deputy_chair', 'secretariat', 'member', 'observer'));

-- ============================================================
-- STEP 2: Create working_group_meetings table
-- ============================================================

CREATE TABLE IF NOT EXISTS working_group_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  agenda TEXT,
  minutes TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wg_meetings_group ON working_group_meetings(working_group_id);
CREATE INDEX IF NOT EXISTS idx_wg_meetings_date ON working_group_meetings(meeting_date);

-- ============================================================
-- STEP 3: Create working_group_meeting_attendees table
-- ============================================================

CREATE TABLE IF NOT EXISTS working_group_meeting_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES working_group_meetings(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES working_group_memberships(id) ON DELETE SET NULL,
  person_name VARCHAR(255) NOT NULL,
  attended BOOLEAN DEFAULT false,
  UNIQUE(meeting_id, membership_id)
);

-- ============================================================
-- STEP 4: Add meeting_id to documents for linking docs to meetings
-- ============================================================

ALTER TABLE working_group_documents ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES working_group_meetings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wg_documents_meeting ON working_group_documents(meeting_id);

-- ============================================================
-- STEP 5: Add group_type, banner, icon_url to working_groups
-- ============================================================

ALTER TABLE working_groups ADD COLUMN IF NOT EXISTS group_type VARCHAR(50);
ALTER TABLE working_groups ADD COLUMN IF NOT EXISTS banner TEXT;
ALTER TABLE working_groups ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- ============================================================
-- STEP 6: Add contact_id to memberships for linking to contacts
-- ============================================================

ALTER TABLE working_group_memberships ADD COLUMN IF NOT EXISTS contact_id UUID;

-- ============================================================
-- STEP 7: Add calendar_event_id to meetings for calendar sync
-- ============================================================

ALTER TABLE working_group_meetings ADD COLUMN IF NOT EXISTS calendar_event_id UUID;
