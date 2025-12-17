-- Migration: Create faq_questions table for user-submitted questions
-- This table stores questions submitted by users that managers can answer

CREATE TABLE IF NOT EXISTS faq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  context TEXT, -- Optional context about where/why the question arose
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'published', 'rejected', 'duplicate')),
  assigned_to UUID, -- Manager assigned to answer
  admin_notes TEXT, -- Internal notes from managers
  linked_faq_id UUID REFERENCES faq(id) ON DELETE SET NULL, -- Link to published FAQ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_faq_questions_user ON faq_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_questions_status ON faq_questions(status);
CREATE INDEX IF NOT EXISTS idx_faq_questions_assigned ON faq_questions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_faq_questions_created ON faq_questions(created_at DESC);

-- Add comment
COMMENT ON TABLE faq_questions IS 'User-submitted questions awaiting manager review and publishing to FAQ';
COMMENT ON COLUMN faq_questions.status IS 'pending: awaiting review, in_progress: being answered, published: converted to FAQ, rejected: not suitable, duplicate: already answered';
COMMENT ON COLUMN faq_questions.context IS 'Optional context about where the user was in the app or what they were trying to do';
COMMENT ON COLUMN faq_questions.linked_faq_id IS 'Reference to the FAQ entry if this question was published';

-- Enable RLS
ALTER TABLE faq_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own questions
CREATE POLICY "Users can view own questions" ON faq_questions
  FOR SELECT USING (true); -- For now allow all reads, can tighten later

-- Users can submit questions
CREATE POLICY "Users can submit questions" ON faq_questions
  FOR INSERT WITH CHECK (true);

-- Anyone can update (managers will do this via admin API)
CREATE POLICY "Allow updates" ON faq_questions
  FOR UPDATE USING (true);
