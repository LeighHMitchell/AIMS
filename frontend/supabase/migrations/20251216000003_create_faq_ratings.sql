-- Migration: Create faq_ratings table for user feedback on FAQs
-- Tracks both question helpfulness and answer helpfulness ratings

CREATE TABLE IF NOT EXISTS faq_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES faq(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating_type TEXT NOT NULL CHECK (rating_type IN ('question_helpful', 'answer_helpful')),
  is_positive BOOLEAN NOT NULL, -- true = thumbs up, false = thumbs down
  comment TEXT, -- Optional feedback comment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only rate each type once per FAQ
  UNIQUE(faq_id, user_id, rating_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faq_ratings_faq ON faq_ratings(faq_id);
CREATE INDEX IF NOT EXISTS idx_faq_ratings_user ON faq_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_ratings_type ON faq_ratings(rating_type);

-- Add comments
COMMENT ON TABLE faq_ratings IS 'User ratings for FAQ questions and answers';
COMMENT ON COLUMN faq_ratings.rating_type IS 'question_helpful: was the question clear/useful, answer_helpful: was the answer helpful';
COMMENT ON COLUMN faq_ratings.is_positive IS 'true for thumbs up, false for thumbs down';
COMMENT ON COLUMN faq_ratings.comment IS 'Optional feedback explaining the rating';

-- Enable RLS
ALTER TABLE faq_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access" ON faq_ratings
  FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON faq_ratings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update own ratings" ON faq_ratings
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete own ratings" ON faq_ratings
  FOR DELETE USING (true);
