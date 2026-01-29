-- Migration: Create user_pinned_reports table for pinned reports feature
-- Allows users to pin up to 4 favorite reports for quick access

CREATE TABLE user_pinned_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES saved_pivot_reports(id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_id)
);

-- Index for fast lookups by user
CREATE INDEX idx_user_pinned_reports_user_id ON user_pinned_reports(user_id);
CREATE INDEX idx_user_pinned_reports_report_id ON user_pinned_reports(report_id);

-- Enable Row Level Security
ALTER TABLE user_pinned_reports ENABLE ROW LEVEL SECURITY;

-- Users can only view their own pins
CREATE POLICY "Users can view own pins" ON user_pinned_reports
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

-- Users can only insert their own pins
CREATE POLICY "Users can insert own pins" ON user_pinned_reports
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own pins
CREATE POLICY "Users can delete own pins" ON user_pinned_reports
  FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE user_pinned_reports IS 'Stores user-pinned report preferences. Users can pin up to 4 reports for quick access.';
COMMENT ON COLUMN user_pinned_reports.user_id IS 'The user who pinned the report';
COMMENT ON COLUMN user_pinned_reports.report_id IS 'The report that was pinned';
COMMENT ON COLUMN user_pinned_reports.pinned_at IS 'When the report was pinned';
