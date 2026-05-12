-- Create location field reports system
-- Stores per-location event narratives (workshops, field visits, etc.) with photo and document attachments
-- Each location can have many field reports; each report can have many attachments (photos or documents)

-- ============================================================
-- location_field_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS location_field_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES activity_locations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE, -- denormalised for RLS

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
  )
);

CREATE INDEX IF NOT EXISTS idx_location_field_reports_location_id ON location_field_reports(location_id);
CREATE INDEX IF NOT EXISTS idx_location_field_reports_activity_id ON location_field_reports(activity_id);
CREATE INDEX IF NOT EXISTS idx_location_field_reports_event_date ON location_field_reports(event_date);
CREATE INDEX IF NOT EXISTS idx_location_field_reports_event_type ON location_field_reports(event_type);

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
  file_path TEXT,            -- Path in Supabase Storage bucket "uploads"
  thumbnail_url TEXT,

  caption TEXT,              -- For photos
  title TEXT,                -- For documents
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT location_field_report_attachments_url_not_empty CHECK (url IS NOT NULL AND url <> '')
);

CREATE INDEX IF NOT EXISTS idx_lfr_attachments_field_report_id ON location_field_report_attachments(field_report_id);
CREATE INDEX IF NOT EXISTS idx_lfr_attachments_media_type ON location_field_report_attachments(media_type);

-- ============================================================
-- updated_at trigger for field reports
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
-- RLS — mirrors activity_documents pattern
-- ============================================================
ALTER TABLE location_field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_field_report_attachments ENABLE ROW LEVEL SECURITY;

-- ---- location_field_reports policies ----

DROP POLICY IF EXISTS "View location field reports" ON location_field_reports;
CREATE POLICY "View location field reports"
ON location_field_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = location_field_reports.activity_id
    AND (
      a.publication_status = 'published'
      OR (
        auth.uid() IS NOT NULL
        AND (
          a.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM activity_contributors ac
            WHERE ac.activity_id = a.id
            AND ac.user_id = auth.uid()
            AND ac.role IN ('editor', 'admin', 'viewer')
          )
          OR EXISTS (
            SELECT 1 FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
            AND uo.organization_id = a.reporting_org_id
          )
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Insert location field reports" ON location_field_reports;
CREATE POLICY "Insert location field reports"
ON location_field_reports FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = location_field_reports.activity_id
    AND (
      a.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM activity_contributors ac
        WHERE ac.activity_id = a.id
        AND ac.user_id = auth.uid()
        AND ac.role IN ('editor', 'admin')
      )
    )
  )
);

DROP POLICY IF EXISTS "Update location field reports" ON location_field_reports;
CREATE POLICY "Update location field reports"
ON location_field_reports FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = location_field_reports.activity_id
      AND (
        a.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM activity_contributors ac
          WHERE ac.activity_id = a.id
          AND ac.user_id = auth.uid()
          AND ac.role IN ('editor', 'admin')
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Delete location field reports" ON location_field_reports;
CREATE POLICY "Delete location field reports"
ON location_field_reports FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = location_field_reports.activity_id
      AND (
        a.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM activity_contributors ac
          WHERE ac.activity_id = a.id
          AND ac.user_id = auth.uid()
          AND ac.role = 'admin'
        )
      )
    )
  )
);

-- ---- location_field_report_attachments policies (chain through report -> activity) ----

DROP POLICY IF EXISTS "View location field report attachments" ON location_field_report_attachments;
CREATE POLICY "View location field report attachments"
ON location_field_report_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM location_field_reports r
    JOIN activities a ON a.id = r.activity_id
    WHERE r.id = location_field_report_attachments.field_report_id
    AND (
      a.publication_status = 'published'
      OR (
        auth.uid() IS NOT NULL
        AND (
          a.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM activity_contributors ac
            WHERE ac.activity_id = a.id
            AND ac.user_id = auth.uid()
            AND ac.role IN ('editor', 'admin', 'viewer')
          )
          OR EXISTS (
            SELECT 1 FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
            AND uo.organization_id = a.reporting_org_id
          )
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Insert location field report attachments" ON location_field_report_attachments;
CREATE POLICY "Insert location field report attachments"
ON location_field_report_attachments FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM location_field_reports r
    JOIN activities a ON a.id = r.activity_id
    WHERE r.id = location_field_report_attachments.field_report_id
    AND (
      a.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM activity_contributors ac
        WHERE ac.activity_id = a.id
        AND ac.user_id = auth.uid()
        AND ac.role IN ('editor', 'admin')
      )
    )
  )
);

DROP POLICY IF EXISTS "Update location field report attachments" ON location_field_report_attachments;
CREATE POLICY "Update location field report attachments"
ON location_field_report_attachments FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM location_field_reports r
      JOIN activities a ON a.id = r.activity_id
      WHERE r.id = location_field_report_attachments.field_report_id
      AND (
        a.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM activity_contributors ac
          WHERE ac.activity_id = a.id
          AND ac.user_id = auth.uid()
          AND ac.role IN ('editor', 'admin')
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Delete location field report attachments" ON location_field_report_attachments;
CREATE POLICY "Delete location field report attachments"
ON location_field_report_attachments FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM location_field_reports r
      JOIN activities a ON a.id = r.activity_id
      WHERE r.id = location_field_report_attachments.field_report_id
      AND (
        a.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM activity_contributors ac
          WHERE ac.activity_id = a.id
          AND ac.user_id = auth.uid()
          AND ac.role IN ('editor', 'admin')
        )
      )
    )
  )
);

COMMENT ON TABLE location_field_reports IS 'Field events (workshops, visits, M&E, etc.) recorded at a specific activity location';
COMMENT ON TABLE location_field_report_attachments IS 'Photos and documents attached to a location field report';
