-- ============================================================================
-- MANUAL APPLY: Field Trips tables
-- ============================================================================
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query
-- → paste → Run) for project lhiayyjwkjkjkxvhcenw.
--
-- Fixes the "Could not find the table 'public.location_field_reports' in the
-- schema cache" error when saving a field trip.
--
-- It is fully idempotent (CREATE ... IF NOT EXISTS / DROP ... IF EXISTS /
-- ADD COLUMN IF NOT EXISTS), so re-running it is safe.
--
-- NOTE ON SECURITY MODEL
-- ----------------------
-- The original repo migrations carried RLS policies copied from a different
-- schema: they reference activity_contributors.user_id and a permission-level
-- `role` ('editor'/'admin'), plus user_organizations membership. In THIS
-- database none of that holds — activity_contributors is organisation-based
-- (organization_id, status), and user_organizations is empty. That broken RLS
-- is why the first paste failed with: column ac.user_id does not exist.
--
-- The sibling editor feature tables in this deployment (activity_locations,
-- activity_documents) operate WITHOUT RLS gating: authorisation is enforced at
-- the API layer (requireAuth() on every /api/activities/[id]/field-trips call).
-- These tables follow the same, consistent model. If you later want DB-level
-- RLS, that is a separate hardening pass that must also cover the sibling
-- tables — don't bolt mismatched policies onto this one in isolation.
-- ============================================================================


-- ============================================================
-- location_field_reports  (stores field trips; location_id NULL = standalone)
-- ============================================================
CREATE TABLE IF NOT EXISTS location_field_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Optional: NULL for standalone field trips that carry their own coordinates.
  location_id UUID REFERENCES activity_locations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'workshop',
    'field_visit',
    'monitoring_evaluation',
    'training',
    'community_consultation',
    'inception',
    'handover',
    'other'
  )),
  event_type_other TEXT,
  title TEXT NOT NULL,
  place_name TEXT,
  latitude  DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  event_date DATE,
  event_end_date DATE,
  narrative TEXT,
  participants_count INTEGER CHECK (participants_count IS NULL OR participants_count >= 0),
  lead_organisation_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT location_field_reports_title_not_empty CHECK (title IS NOT NULL AND title <> ''),
  CONSTRAINT location_field_reports_end_after_start CHECK (
    event_end_date IS NULL OR event_date IS NULL OR event_end_date >= event_date
  ),
  -- A standalone trip (no location_id) must carry its own coordinates.
  CONSTRAINT location_field_reports_has_place CHECK (
    location_id IS NOT NULL
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

-- For DBs where the table already existed from a partial earlier run, make
-- sure the standalone-trip columns / constraint are present too.
ALTER TABLE location_field_reports ALTER COLUMN location_id DROP NOT NULL;
ALTER TABLE location_field_reports
  ADD COLUMN IF NOT EXISTS place_name TEXT,
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE location_field_reports
  DROP CONSTRAINT IF EXISTS location_field_reports_has_place;
ALTER TABLE location_field_reports
  ADD CONSTRAINT location_field_reports_has_place CHECK (
    location_id IS NOT NULL
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_location_field_reports_location_id ON location_field_reports(location_id);
CREATE INDEX IF NOT EXISTS idx_location_field_reports_activity_id ON location_field_reports(activity_id);
CREATE INDEX IF NOT EXISTS idx_location_field_reports_event_date ON location_field_reports(event_date);
CREATE INDEX IF NOT EXISTS idx_location_field_reports_event_type ON location_field_reports(event_type);
CREATE INDEX IF NOT EXISTS idx_location_field_reports_standalone
  ON location_field_reports (activity_id)
  WHERE location_id IS NULL;


-- ============================================================
-- location_field_report_attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS location_field_report_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_report_id UUID NOT NULL REFERENCES location_field_reports(id) ON DELETE CASCADE,

  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'document')),
  url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  file_path TEXT,
  thumbnail_url TEXT,

  caption TEXT,
  title TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT location_field_report_attachments_url_not_empty CHECK (url IS NOT NULL AND url <> '')
);

CREATE INDEX IF NOT EXISTS idx_lfr_attachments_field_report_id ON location_field_report_attachments(field_report_id);
CREATE INDEX IF NOT EXISTS idx_lfr_attachments_media_type ON location_field_report_attachments(media_type);


-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_location_field_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_location_field_reports_updated_at ON location_field_reports;
CREATE TRIGGER trigger_update_location_field_reports_updated_at
  BEFORE UPDATE ON location_field_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_location_field_reports_updated_at();


-- ============================================================
-- Access — consistent with sibling editor tables in this DB.
-- RLS stays disabled; the API layer (requireAuth()) is the gate.
-- ============================================================
ALTER TABLE location_field_reports            DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_field_report_attachments DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON location_field_reports            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON location_field_report_attachments TO authenticated;
GRANT SELECT                         ON location_field_reports            TO anon;
GRANT SELECT                         ON location_field_report_attachments TO anon;
GRANT ALL                            ON location_field_reports            TO service_role;
GRANT ALL                            ON location_field_report_attachments TO service_role;

COMMENT ON TABLE location_field_reports IS 'Field trips / field events (workshops, visits, M&E, etc.). location_id NULL = standalone trip carrying its own lat/long/place_name.';
COMMENT ON TABLE location_field_report_attachments IS 'Photos and documents attached to a field trip.';
COMMENT ON COLUMN location_field_reports.location_id IS 'Optional. NULL for standalone field trips that carry their own coordinates.';
COMMENT ON COLUMN location_field_reports.place_name IS 'Free-text place name for a standalone field trip (e.g. "Yangon training centre").';

-- Reload PostgREST's schema cache so the API sees the new table immediately.
NOTIFY pgrst, 'reload schema';
