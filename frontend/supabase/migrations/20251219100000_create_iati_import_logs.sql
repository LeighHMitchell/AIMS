-- Migration: Create IATI Import Logs table
-- Purpose: Track all IATI import operations for audit and monitoring

CREATE TABLE IF NOT EXISTS iati_import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Import metadata
  import_source TEXT NOT NULL, -- 'xml_upload', 'url_import', 'iati_search', 'bulk_import', 'fork', 'merge'
  import_file_name TEXT, -- original XML file name if applicable
  import_date TIMESTAMPTZ DEFAULT NOW(),

  -- Activity information
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  iati_identifier TEXT, -- the IATI identifier being imported
  activity_title TEXT, -- snapshot of activity title at import time

  -- User who performed import
  imported_by UUID, -- user ID (not FK to allow flexibility)
  imported_by_name TEXT, -- name snapshot for display
  imported_by_email TEXT, -- email snapshot

  -- Organisation information
  reporting_org_ref TEXT, -- IATI reporting org reference
  reporting_org_name TEXT, -- reporting org name
  importing_org_name TEXT, -- the organisation the user belongs to

  -- Import details
  import_type TEXT NOT NULL, -- 'create_new', 'update_existing', 'merge', 'fork_as_draft'
  import_status TEXT NOT NULL DEFAULT 'success', -- 'success', 'partial', 'failed'

  -- What was imported (counts)
  transactions_imported INTEGER DEFAULT 0,
  budgets_imported INTEGER DEFAULT 0,
  sectors_imported INTEGER DEFAULT 0,
  locations_imported INTEGER DEFAULT 0,
  documents_imported INTEGER DEFAULT 0,
  contacts_imported INTEGER DEFAULT 0,
  results_imported INTEGER DEFAULT 0,

  -- Errors and warnings
  error_message TEXT,
  warnings JSONB DEFAULT '[]'::jsonb,

  -- External source reference (for linking to IATI Datastore)
  iati_datastore_url TEXT, -- direct link to the record in IATI Datastore

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_iati_import_logs_activity ON iati_import_logs(activity_id);
CREATE INDEX idx_iati_import_logs_user ON iati_import_logs(imported_by);
CREATE INDEX idx_iati_import_logs_date ON iati_import_logs(import_date DESC);
CREATE INDEX idx_iati_import_logs_status ON iati_import_logs(import_status);
CREATE INDEX idx_iati_import_logs_source ON iati_import_logs(import_source);
CREATE INDEX idx_iati_import_logs_org ON iati_import_logs(reporting_org_ref);
CREATE INDEX idx_iati_import_logs_iati_id ON iati_import_logs(iati_identifier);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_iati_import_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER iati_import_logs_updated_at
  BEFORE UPDATE ON iati_import_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_iati_import_logs_updated_at();

-- Enable RLS
ALTER TABLE iati_import_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access for authenticated users (admin view)
CREATE POLICY "Allow read access for authenticated users" ON iati_import_logs
  FOR SELECT
  USING (true);

-- Policy: Allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" ON iati_import_logs
  FOR INSERT
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE iati_import_logs IS 'Audit log of all IATI import operations for monitoring and data quality oversight';
