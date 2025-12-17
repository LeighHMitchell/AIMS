-- Migration: Add new columns to existing faq table
-- Adds status, source_question_id, view_count, and is_pinned

-- Add status column for draft/published/archived workflow
ALTER TABLE faq ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'
  CHECK (status IN ('draft', 'published', 'archived'));

-- Link to the original user question if this FAQ came from a submitted question
ALTER TABLE faq ADD COLUMN IF NOT EXISTS source_question_id UUID REFERENCES faq_questions(id) ON DELETE SET NULL;

-- Track view count for analytics
ALTER TABLE faq ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Allow pinning important FAQs to the top
ALTER TABLE faq ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_faq_status ON faq(status);
CREATE INDEX IF NOT EXISTS idx_faq_pinned ON faq(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_source_question ON faq(source_question_id);

-- Add comments
COMMENT ON COLUMN faq.status IS 'draft: not yet visible, published: visible to all, archived: hidden but preserved';
COMMENT ON COLUMN faq.source_question_id IS 'Reference to the user question that led to this FAQ entry';
COMMENT ON COLUMN faq.view_count IS 'Number of times this FAQ has been viewed';
COMMENT ON COLUMN faq.is_pinned IS 'Pinned FAQs appear at the top of the list';
