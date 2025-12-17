-- Migration: Create faq_attachments table for file attachments on FAQ entries
-- Supports images, documents, and other files attached to FAQ answers

CREATE TABLE IF NOT EXISTS faq_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES faq(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT, -- MIME type
  file_size INTEGER, -- Size in bytes
  display_order INTEGER DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faq_attachments_faq ON faq_attachments(faq_id);
CREATE INDEX IF NOT EXISTS idx_faq_attachments_order ON faq_attachments(faq_id, display_order);

-- Add comments
COMMENT ON TABLE faq_attachments IS 'File attachments for FAQ entries (images, documents, etc.)';
COMMENT ON COLUMN faq_attachments.file_url IS 'URL to the file in storage';
COMMENT ON COLUMN faq_attachments.file_type IS 'MIME type of the file';
COMMENT ON COLUMN faq_attachments.display_order IS 'Order for displaying multiple attachments';
COMMENT ON COLUMN faq_attachments.caption IS 'Optional caption or description for the attachment';

-- Enable RLS
ALTER TABLE faq_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - attachments are public if the FAQ is public
CREATE POLICY "Allow read access" ON faq_attachments
  FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON faq_attachments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update" ON faq_attachments
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete" ON faq_attachments
  FOR DELETE USING (true);
